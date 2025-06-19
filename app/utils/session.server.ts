import { createCookieSessionStorage, data } from 'react-router';
import * as crypto from "node:crypto";

const { commitSession, getSession } = createCookieSessionStorage<{
  pid: string;
}>({
  // no expiry, not a secure cookie, really just an id to remember a player
  cookie: {
    name: 'player-session',
    sameSite: 'lax',
    path: '/',
  },
});

export async function getPlayerSession(request: Request) {
  const playerSession = await getSession(request.headers.get('Cookie'));

  const pid = playerSession.get('pid');

  if (!pid) {
    return null;
  }

  return {
    pid,
  };
}

export async function createPlayerSession() {
  const pid = crypto.randomUUID();
  const session = await getSession();

  session.set('pid', pid);

  return data(
    { pid },
    { headers: { 'Set-Cookie': await commitSession(session) } },
  );
}

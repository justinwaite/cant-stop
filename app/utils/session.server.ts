import { createCookieSessionStorage, data } from 'react-router';
import * as crypto from 'node:crypto';

const { commitSession, getSession } = createCookieSessionStorage<{
  pid: string;
  previousName?: string;
  previousColor?: string;
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
    previousName: playerSession.get('previousName') ?? null,
    previousColor: playerSession.get('previousColor') ?? null,
  };
}

export async function createPlayerSession() {
  const pid = crypto.randomUUID();
  const session = await getSession();

  session.set('pid', pid);

  return data(
    { pid, previousName: null, previousColor: null },
    { headers: { 'Set-Cookie': await commitSession(session) } },
  );
}

export async function createUpdateSessionHeaders(
  request: Request,
  {
    previousName,
    previousColor,
  }: {
    previousName?: string;
    previousColor?: string;
  },
) {
  console.log('remembering player info', { previousName, previousColor });
  const session = await getSession(request.headers.get('Cookie'));
  if (previousName) {
    session.set('previousName', previousName);
  }
  if (previousColor) {
    session.set('previousColor', previousColor);
  }
  return { 'Set-Cookie': await commitSession(session) };
}

import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('/game/:gameId', 'routes/game.tsx'),
  route('/game/:gameId/stream', 'routes/game.stream.ts'),
  route('/game/:gameId/action', 'routes/game.action.ts'),
  route('/api/pick-color', 'routes/api.pick-color.ts'),
] satisfies RouteConfig;

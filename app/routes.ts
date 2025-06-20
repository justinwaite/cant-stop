import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('/game/:gameId', 'routes/game.tsx'),
  route('/game/:gameId/stream', 'routes/game.stream.tsx'),
  route('/game/:gameId/action', 'routes/game.action.tsx'),
  route('/api/pick-color', 'routes/api.pick-color.tsx'),
] satisfies RouteConfig;

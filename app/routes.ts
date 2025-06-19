import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('/board/stream', 'routes/board.stream.tsx'),
  route('/board/action', 'routes/board.action.tsx'),
] satisfies RouteConfig;

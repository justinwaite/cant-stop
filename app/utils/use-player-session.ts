import {useRouteLoaderData} from "react-router";
import type {Route} from "../../.react-router/types/app/+types/root";

export function usePlayerSession() {
  const rootLoaderData = useRouteLoaderData<Route.ComponentProps['loaderData']>('root')

  if (!rootLoaderData) {
    throw new Error('Root loader data is not available');
  }

  return rootLoaderData;
}
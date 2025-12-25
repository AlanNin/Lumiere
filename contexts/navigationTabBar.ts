import { createContext } from "react";

type NavigationTabBarTransition = {
  begin: () => void;
};

export const NavigationTabBarTransitionContext =
  createContext<NavigationTabBarTransition>({
    begin: () => {},
  });

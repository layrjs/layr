import React, {useRef, useContext} from 'react';

export function RootView({
  children,
  ...customization
}: Partial<Customization> & {children: React.ReactNode}) {
  const previousCustomization = useContext(CustomizationContext);

  if (previousCustomization !== undefined) {
    throw new Error("An application shouldn't have more than one RootView");
  }

  const actionView = useRef<ActionView>(null);

  return (
    <CustomizationContext.Provider
      value={{
        dataPlaceholder: () => null,
        errorRenderer: (error) => {
          console.error(error);
          return <div>Sorry, an error occurred.</div>;
        },
        actionWrapper: async (actionHandler, args) => {
          actionView.current!.open();
          try {
            return await actionHandler(...args);
          } finally {
            actionView.current!.close();
          }
        },
        errorNotifier: async (_error) => {
          alert('Sorry, an error occurred.');
        },
        ...customization
      }}
    >
      <ActionView ref={actionView} />
      {children}
    </CustomizationContext.Provider>
  );
}

type Customization = {
  dataPlaceholder: () => JSX.Element | null;
  errorRenderer: (error: Error) => JSX.Element | null;
  actionWrapper: (actionHandler: (...args: any[]) => Promise<any>, args: any[]) => Promise<any>;
  errorNotifier: (error: Error) => Promise<void>;
};

export const CustomizationContext = React.createContext<Customization | undefined>(undefined);

export function useCustomization() {
  const customization = useContext(CustomizationContext);

  if (customization === undefined) {
    throw new Error(
      "Couldn't get the current customization. Please make sure you have included the RootView at the top of your React component tree."
    );
  }

  return customization;
}

export function Customizer({
  children,
  ...customization
}: Partial<Customization> & {children: React.ReactNode}) {
  const previousCustomization = useCustomization();

  return (
    <CustomizationContext.Provider value={{...previousCustomization, ...customization}}>
      {children}
    </CustomizationContext.Provider>
  );
}

class ActionView extends React.Component<{}, {count: number; activeElement: Element | null}> {
  state = {
    count: 0,
    activeElement: null
  };

  open() {
    this.setState(({count, activeElement}) => {
      count++;

      if (count === 1) {
        activeElement = document.activeElement;

        setTimeout(() => {
          if (typeof (activeElement as any)?.blur === 'function') {
            (activeElement as any).blur();
          }
        }, 0);
      }

      return {count, activeElement};
    });
  }

  close() {
    this.setState(({count, activeElement}) => {
      count--;

      if (count === 0) {
        const savedActiveElement = activeElement;

        setTimeout(() => {
          if (typeof (savedActiveElement as any)?.focus === 'function') {
            (savedActiveElement as any).focus();
          }
        }, 0);

        activeElement = null;
      }

      return {count, activeElement};
    });
  }

  render() {
    return (
      <div
        style={{
          display: this.state.count > 0 ? 'block' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'white',
          opacity: 0.5,
          zIndex: 30000
        }}
      />
    );
  }
}

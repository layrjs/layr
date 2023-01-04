import {Routable} from '@layr/routable';
import React, {Fragment} from 'react';
import {layout, page, useData} from '@layr/react-integration';

import type {Application as BackendApplication} from '../../../backend/src/components/application';

export const extendApplication = (Base: typeof BackendApplication) => {
  class Application extends Routable(Base) {
    declare ['constructor']: typeof Application;

    @layout('/') static MainLayout({children}: {children: () => any}) {
      return (
        <>
          <this.MainPage.Link>
            <h1>{process.env.APPLICATION_NAME}</h1>
          </this.MainPage.Link>
          {children()}
        </>
      );
    }

    @page('[/]') static MainPage() {
      return (
        <p>
          <this.HelloWorldPage.Link>See the "Hello, World!" page</this.HelloWorldPage.Link>
        </p>
      );
    }

    @page('[/]hello-world') static HelloWorldPage() {
      return useData(
        async () => await this.getHelloWorld(),

        (helloWorld) => <p>{helloWorld}</p>
      );
    }

    @page('[/]*') static NotFoundPage() {
      return (
        <>
          <h2>Page not found</h2>
          <p>Sorry, there is nothing here.</p>
        </>
      );
    }
  }

  return Application;
};

export declare const Application: ReturnType<typeof extendApplication>;

export type Application = InstanceType<typeof Application>;

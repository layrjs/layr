import {Component, consume} from '@liaison/component';
import {Routable, route} from '@liaison/routable';
import {useState, useEffect} from 'react';
import {jsx} from '@emotion/core';
import {view} from '@liaison/react-integration';

import type {Docs} from './docs';
import type {Newsletter} from './newsletter';
import type {Common} from './common';
import type {UI} from './ui';
// @ts-ignore
import objectOriented from '../assets/object-oriented-20200915.immutable.svg';
// @ts-ignore
import fullStack from '../assets/full-stack-20200916.immutable.svg';
// @ts-ignore
import webApp from '../assets/web-app-20200915.immutable.svg';
// @ts-ignore
import noREST from '../assets/no-rest-20200915.immutable.svg';
// @ts-ignore
import noGraphQL from '../assets/no-graphql-20200915.immutable.svg';
// @ts-ignore
import noFramework from '../assets/no-framework-20200915.immutable.svg';
// @ts-ignore
import javascript from '../assets/javascript-20200915.immutable.svg';
// @ts-ignore
import typescript from '../assets/typescript-20200915.immutable.svg';
// @ts-ignore
import openSource from '../assets/open-source-20200915.immutable.svg';
// @ts-ignore
import mvilaProfile from '../assets/manuel-vila-profile-20200915.immutable.jpg';

const HERO_IMAGES = [
  {image: objectOriented, alt: '#ObjectOriented'},
  {image: fullStack, alt: '#FullStack'},
  {image: webApp, alt: '#WebApp'},
  {image: noREST, alt: '#NoREST'},
  {image: noGraphQL, alt: '#NoGraphQL'},
  {image: noFramework, alt: '#NoFramework'},
  {image: javascript, alt: '#JavaScript'},
  {image: typescript, alt: '#TypeScript'},
  {image: openSource, alt: '#OpenSource'}
];

const HERO_IMAGE_DURATION = 1000;

const INTRODUCTION_MESSAGE = `
Hi, everyone! 👋

Let's talk about web app development.

It used to be simple. We implemented everything in the backend with some PHP code or Ruby on Rails and then, with a bit of JavaScript running in the frontend, we were done.

But times have changed. Modern web apps require rich user interfaces that can no longer be rendered in the backend.

So, from a bit of JavaScript running in the frontend, we switched to a lot of JavaScript using a single-page application model and a bunch of libraries.

There's nothing wrong with this. It's actually quite an elegant architecture:

- The frontend is in charge of the user interface.
- The backend takes care of the data model and the business logic.

The problem, however, lies in the middle. Now that we have two rich execution environments, we need to make sure that they communicate effectively. So, we implement a web API (REST, GraphQL, etc.), and [everything gets complicated](/blog/articles/Simplify-Full-Stack-Development-with-a-Unified-Architecture-187fr1).

Conceptually, it's like we're building two applications instead of one.

The data model gets duplicated, and the overall complexity is such that the developers become duplicated as well.

If you're a frontend or backend developer, you can only do half the job, and you waste a lot of time communicating with the person in charge of the other half.

If you're a full-stack developer, you can implement a feature from start to finish in a much more efficient and satisfying way. But, given the sophistication of the stack, there's a lot you have to deal with, and it doesn't scale very well.

Ideally, we should all be full-stack developers just like we were in the beginning. But we need to dramatically simplify the stack to make this possible.

So, how to simplify the stack?

Sure, the frontend and the backend need to be *physically* separated. But it doesn't mean that they have to be *logically* separated.

With the right abstractions in place, an application can run in two different execution environments, even as it remains a single thing from the developer's point of view.

This is precisely what Liaison offers — a reuniting of the frontend and the backend.

The data model can be shared across the stack, and there is no need to build a web API anymore.

Some might argue that mastering both the frontend and the backend is not that easy.

The frontend is not only UI rendering, but it's also state management, routing, etc.

The backend is not only data modeling and business logic, but it's also data storage, authorization, etc.

Fair enough, it's not that easy. But here, Liaison also has [a lot to offer](/docs).

So, hopefully, everyone can be a full-stack developer again.

Happy coding! 🧑‍💻
`;

export class Home extends Routable(Component) {
  @consume() static Docs: typeof Docs;
  @consume() static Newsletter: ReturnType<typeof Newsletter>;
  @consume() static Common: typeof Common;
  @consume() static UI: typeof UI;

  @route('/') @view() static Main() {
    const {Newsletter, Common, UI} = this;

    const theme = UI.useTheme();

    Common.useTitle('A love story between the frontend and the backend');

    UI.useAnchor();

    return (
      <div>
        <UI.FullHeight
          css={{display: 'flex', flexDirection: 'column', backgroundColor: UI.colors.blueGrey800}}
        >
          <Common.Header />
          <this.Hero css={{flexGrow: 1}} />
          <Common.Scroller id="introduction" />
        </UI.FullHeight>

        <div
          id="introduction"
          css={UI.responsive({
            padding: ['5rem 1.5rem 5.5rem 1.5rem', , '2.5rem 15px 3rem 15px'],
            borderBottom: `${theme.borderWidth} solid ${theme.borderColor}`
          })}
        >
          <this.Introduction />
        </div>

        <UI.FullHeight
          css={{
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div css={{flexGrow: 1, display: 'flex', justifyContent: 'center'}}>
            <div css={{flexBasis: 850, display: 'flex', flexDirection: 'column'}}>
              <this.GettingStarted css={{flexGrow: 1}} />
              <Newsletter.Subscription
                css={{
                  flexGrow: 1,
                  borderTop: `${theme.borderWidth} solid ${theme.borderColor}`
                }}
              />
            </div>
          </div>
          <Common.Footer />
        </UI.FullHeight>
      </div>
    );
  }

  @view() static Hero({...props}) {
    const [imageIndex, setImageIndex] = useState(0);

    useEffect(() => {
      const timeoutId = setTimeout(() => {
        let newIndex = imageIndex + 1;

        if (newIndex >= HERO_IMAGES.length) {
          newIndex = 0;
        }

        setImageIndex(newIndex);
      }, HERO_IMAGE_DURATION);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [imageIndex]);

    const {image, alt} = HERO_IMAGES[imageIndex];

    return (
      <div
        css={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem'}}
        {...props}
      >
        <div css={{flexBasis: '600px'}}>
          <img src={image} alt={alt} css={{width: '100%'}} />
        </div>
      </div>
    );
  }

  @view() static Introduction() {
    const {UI} = this;

    const theme = UI.getTheme();

    return (
      <div css={UI.responsive({maxWidth: 800, margin: '0 auto', fontSize: ['1.25rem', , '1rem']})}>
        <UI.Markdown>{INTRODUCTION_MESSAGE}</UI.Markdown>
        <a
          href="https://mvila.me"
          target="_blank"
          rel="noopener noreferrer"
          css={{
            'maxWidth': 300,
            'marginTop': '2.5rem',
            'paddingTop': '1rem',
            'display': 'flex',
            'alignItems': 'center',
            'borderTop': `${theme.borderWidth} solid ${theme.borderColor}`,
            'color': theme.textColor,
            ':hover': {
              color: theme.textColor,
              textDecoration: 'none'
            }
          }}
        >
          <img
            src={mvilaProfile}
            alt="Manuel Vila's picture"
            css={UI.responsive({width: [60, , 50], borderRadius: '50%'})}
          />
          <div css={{marginLeft: '1rem'}}>
            <div>Manuel Vila</div>
            <div css={{color: theme.muted.textColor}}>Creator of Liaison</div>
          </div>
        </a>
      </div>
    );
  }

  @view() static GettingStarted({...props}) {
    const {UI} = this;

    const theme = UI.useTheme();

    return (
      <div
        css={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'}}
        {...props}
      >
        <div css={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div
            css={UI.responsive({
              fontSize: ['2rem', , '1.5rem'],
              lineHeight: theme.small.lineHeight,
              textAlign: 'center'
            })}
          >
            Build a full-stack web app two to three times faster
          </div>
          <div
            css={UI.responsive({
              marginTop: '.75rem',
              fontSize: ['1.25rem', , '1rem'],
              color: theme.muted.textColor,
              textAlign: 'center'
            })}
          >
            While still keeping it scalable and maintainable. No bullshit.
          </div>
          <UI.Button
            secondary
            large
            onClick={() => {
              this.Docs.Main.navigate();
            }}
            css={{marginTop: '1.75rem', marginBottom: '.5rem'}}
          >
            Get started
          </UI.Button>
        </div>
      </div>
    );
  }
}

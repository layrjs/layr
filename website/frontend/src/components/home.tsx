import {Component, consume} from '@liaison/component';
import {Routable, route} from '@liaison/routable';
import {jsx} from '@emotion/core';
import {view} from '@liaison/react-integration';

import type {Docs} from './docs';
import type {Newsletter} from './newsletter';
import type {Common} from './common';
import type {UI} from './ui';
// @ts-ignore
import typicalVsUnified from '../assets/typical-stack-vs-unified-stack-20201007.immutable.png';

const NO_WEB_API_BACKEND_EXAMPLE = `
\`\`\`
import {Component, attribute, method, expose} from '@liaison/component';
import {ComponentHTTPServer} from '@liaison/component-http-server';

class Greeter extends Component {
  @expose({set: true}) @attribute() name = 'World';

  @expose({call: true}) @method() async hello() {
    return \`Hello, \${this.name}!\`;
  }
}

const server = new ComponentHTTPServer(Greeter, {port: 3210});

server.start();
\`\`\`
`;

const NO_WEB_API_FRONTEND_EXAMPLE = `
\`\`\`
import {ComponentHTTPClient} from '@liaison/component-http-client';

const client = new ComponentHTTPClient('http://localhost:3210');

const BackendGreeter = await client.getComponent();

class Greeter extends BackendGreeter {
  async hello() {
    return (await super.hello()).toUpperCase();
  }
}

const greeter = new Greeter({name: 'Steve'});

console.log(await greeter.hello());
\`\`\`
`;

const ORM_DATA_MODELING_EXAMPLE = `
\`\`\`
import {Component} from '@liaison/component';
import {Storable, primaryIdentifier, attribute} from '@liaison/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id;
  @attribute() title;
  @attribute() country;
  @attribute() year;
}
\`\`\`
`;

const ORM_STORE_REGISTRATION_EXAMPLE = `
\`\`\`
import {MongoDBStore} from '@liaison/mongodb-store';

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerStorable(Movie);
\`\`\`
`;

const ORM_STORE_CRUD_OPERATIONS_EXAMPLE = `
\`\`\`
// Create
const movie = new Movie({
  id: 'abc123',
  title: 'Inception',
  country: 'USA',
  year: 2010
});
await movie.save();

// Read
const movie = await Movie.get('abc123');

// Update
movie.title = 'Inception 2';
await movie.save();

// Delete
await movie.delete();
\`\`\`
`;

const ORM_STORE_FINDING_DATA_EXAMPLE = `
\`\`\`
// Find the movies starting with an 'I'
const movies = await Movie.find({title: {$startsWith: 'I'}});

// Find the movies released after 2010
const movies = await Movie.find({year: {$greaterThan: 2010}});

// Find the Japanese movies released in 2010
const movies = await Movie.find({country: 'Japan', year: 2010});
\`\`\`
`;

const USER_INTERFACE_ROUTES_EXAMPLE = `
\`\`\`
import {Component} from '@liaison/component';
import {Routable, route} from '@liaison/routable';

class Movie extends Routable(Component) {
  @route('/movies') static List() {
    // Display all the movies...
  }

  @route('/movies/:id') static Item({id}) {
    // Display a specific movie...
  }
}
\`\`\`
`;

const USER_INTERFACE_VIEWS_EXAMPLE = `
\`\`\`
import {Component, attribute} from '@liaison/component';
import React from 'react';
import {view} from '@liaison/react-integration';

class Movie extends Component {
  @attribute() title;
  @attribute() year;
  @attribute() country;

  @view() Home() {
    return (
      <div>
        <this.Heading />
        <this.Details />
      </div>
    );
  }

  @view() Heading() {
    return <h3>{this.title} ({this.year})</h3>;
  }

  @view() Details() {
    return <div>Country: {this.country}</div>;
  }
}
\`\`\`
`;

export class Home extends Routable(Component) {
  @consume() static Docs: typeof Docs;
  @consume() static Newsletter: ReturnType<typeof Newsletter>;
  @consume() static Common: typeof Common;
  @consume() static UI: typeof UI;

  @route('/') @view() static Main() {
    const {Newsletter, Common, UI} = this;

    Common.useTitle('A love story between the frontend and the backend');

    UI.useAnchor();

    return (
      <div>
        <UI.FullHeight
          css={{display: 'flex', flexDirection: 'column', backgroundColor: UI.colors.blueGrey800}}
        >
          <Common.Header />
          <this.Hero css={{flexGrow: 1}} />
          <Common.Scroller id="features" />
        </UI.FullHeight>

        <div id="features" css={{maxWidth: 850, margin: '0 auto'}}>
          <this.NoWebAPI />
          <hr css={{margin: 0}} />
          <this.ORM />
          <hr css={{margin: 0}} />
          <this.UserInterface />
          <hr css={{margin: 0}} />
          <this.DeveloperExperience />
          <hr css={{margin: 0}} />
          <Newsletter.Subscription />
        </div>

        <Common.Footer />
      </div>
    );
  }

  @view() static Hero({...props}) {
    const {UI} = this;

    const theme = UI.useTheme();

    return (
      <div
        css={UI.responsive({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: ['3rem 1.5rem', , '3rem 15px']
        })}
        {...props}
      >
        <div
          css={UI.responsive({
            display: 'flex',
            flexDirection: ['row', 'column-reverse'],
            alignItems: 'center',
            maxWidth: '1024px'
          })}
        >
          <div css={UI.responsive({marginTop: [0, '3rem'], textAlign: ['left', 'center']})}>
            <h2
              css={UI.responsive({
                fontSize: [, , '1.953rem', '1.563rem'],
                lineHeight: '1.45'
              })}
            >
              Dramatically Simplify Full‑Stack Development
            </h2>
            <div
              css={UI.responsive({
                fontSize: ['1.563rem', , , '1.25rem'],
                color: theme.muted.textColor
              })}
            >
              Inherit your frontend from your backend and build your application as if it were a
              single unified thing.
            </div>
            <UI.Button
              secondary
              large
              onClick={() => {
                this.Docs.Main.navigate();
              }}
              css={{marginTop: '2rem'}}
            >
              Get started
            </UI.Button>
          </div>
          <img
            src={typicalVsUnified}
            alt="Typical stack vs unified stack"
            css={UI.responsive({marginLeft: ['2.5rem', 0], maxWidth: [500, , '100%']})}
          />
        </div>
      </div>
    );
  }

  @view() static NoWebAPI() {
    const {Common, UI} = this;

    return (
      <Common.Feature
        title="Look Ma, No Web API"
        description="Stop wasting your time building a web API. With Liaison, the frontend and the backend can [communicate directly](/blog/articles/Do-We-Really-Need-A-Web-API-yq12wz) as if they were not separated."
      >
        <div css={{marginTop: '3rem', maxWidth: 640}}>
          <h5 css={{marginTop: '2rem'}}>Backend</h5>
          <UI.Markdown>{NO_WEB_API_BACKEND_EXAMPLE}</UI.Markdown>
          <h5 css={{marginTop: '2rem'}}>Frontend</h5>
          <UI.Markdown>{NO_WEB_API_FRONTEND_EXAMPLE}</UI.Markdown>
        </div>
      </Common.Feature>
    );
  }

  @view() static ORM() {
    const {Common, UI} = this;

    return (
      <Common.Feature
        title="Database Abstracted Away"
        description={
          "Extend your classes with the [`Storable()`](/docs/v1/reference/storable) mixin, register them into a [store](/docs/v1/reference/store), and you're ready to build your application without having to worry about the database."
        }
      >
        <div css={{marginTop: '3rem', maxWidth: 640}}>
          <h5 css={{marginTop: '2rem'}}>Data Modeling</h5>
          <UI.Markdown>{ORM_DATA_MODELING_EXAMPLE}</UI.Markdown>
          <h5 css={{marginTop: '2rem'}}>Store Registration</h5>
          <UI.Markdown>{ORM_STORE_REGISTRATION_EXAMPLE}</UI.Markdown>
          <h5 css={{marginTop: '2rem'}}>CRUD Operations</h5>
          <UI.Markdown>{ORM_STORE_CRUD_OPERATIONS_EXAMPLE}</UI.Markdown>
          <h5 css={{marginTop: '2rem'}}>Finding Data</h5>
          <UI.Markdown>{ORM_STORE_FINDING_DATA_EXAMPLE}</UI.Markdown>
        </div>
      </Common.Feature>
    );
  }

  @view() static UserInterface() {
    const {Common, UI} = this;

    return (
      <Common.Feature
        title="Encapsulated User Interface"
        description={
          'Implement your [routes](/docs/v1/reference/routable) and [views](/docs/v1/reference/react-integration#view-decorator) as methods of your models, and keep your application as cohesive as possible.'
        }
      >
        <div css={{marginTop: '3rem', maxWidth: 640}}>
          <h5 css={{marginTop: '2rem'}}>Routes</h5>
          <UI.Markdown>{USER_INTERFACE_ROUTES_EXAMPLE}</UI.Markdown>
          <h5 css={{marginTop: '2rem'}}>Views</h5>
          <UI.Markdown>{USER_INTERFACE_VIEWS_EXAMPLE}</UI.Markdown>
        </div>
      </Common.Feature>
    );
  }

  @view() static DeveloperExperience() {
    const {Common, UI} = this;

    return (
      <Common.Feature
        title="Developer Experience First"
        description={
          'Liaison strives to find the right balance between powerful abstractions and ease of use so that you can build an application in the most enjoyable way possible.'
        }
      >
        <UI.Button
          secondary
          large
          onClick={() => {
            this.Docs.Main.navigate();
          }}
          css={{marginTop: '2rem'}}
        >
          Read the docs
        </UI.Button>
      </Common.Feature>
    );
  }
}

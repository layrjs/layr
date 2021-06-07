import {Component, consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {Fragment} from 'react';
import {jsx, useTheme} from '@emotion/react';
import {Button} from '@emotion-starter/react';
import {Container} from '@emotion-kit/react';
import {page, view} from '@layr/react-integration';

import type {createApplicationComponent} from './application';
import type {Docs} from './docs';
import type {createNewsletterComponent} from './newsletter';
import {Markdown} from '../markdown';
import {FeatureSection, FullHeight, Title} from '../utilities';
import typicalVsLayr from '../assets/typical-stack-vs-layr-stack.png';

const NO_WEB_API_BACKEND_EXAMPLE = `
\`\`\`
import {Component, attribute, method, expose} from '@layr/component';
import {ComponentHTTPServer} from '@layr/component-http-server';

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
import {ComponentHTTPClient} from '@layr/component-http-client';

const client = new ComponentHTTPClient('http://localhost:3210');

const BackendGreeter = await client.getComponent();

class Greeter extends BackendGreeter {
  async hello() {
    return (await super.hello()).toUpperCase();
  }
}

const greeter = new Greeter({name: 'Steve'});

await greeter.hello(); // => 'HELLO, STEVE!'
\`\`\`
`;

const ORM_DATA_MODELING_EXAMPLE = `
\`\`\`
import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';

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
import {MongoDBStore} from '@layr/mongodb-store';

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
import {Component} from '@layr/component';
import {Routable, route} from '@layr/routable';

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
import {Component, attribute} from '@layr/component';
import React from 'react';
import {view} from '@layr/react-integration';

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
  @consume() static Application: ReturnType<typeof createApplicationComponent>;
  @consume() static Docs: typeof Docs;
  @consume() static Newsletter: ReturnType<typeof createNewsletterComponent>;

  @page('[]/', {aliases: ['[]/index.html']}) static MainPage() {
    const {Application, Newsletter} = this;

    const theme = useTheme();

    return (
      <>
        <Title>Dramatically simplify full‑stack development</Title>

        <FullHeight
          css={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: theme.colors.background.highlighted
          }}
        >
          <div>
            <Container>
              <Application.HeaderView />
            </Container>
          </div>
          <this.HeroView css={{flexGrow: 1}} />
          <this.ScrollerView id="features" />
        </FullHeight>

        <div id="features" css={{maxWidth: 850, margin: '0 auto'}}>
          <this.NoWebAPIView />
          <hr css={{margin: 0}} />
          <this.ORMView />
          <hr css={{margin: 0}} />
          <this.UserInterfaceView />
          <hr css={{margin: 0}} />
          <Newsletter.SubscriptionView />
        </div>

        <div css={{backgroundColor: theme.colors.background.highlighted}}>
          <Container>
            <Application.FooterView />
          </Container>
        </div>
      </>
    );
  }

  @view() static HeroView({...props}) {
    const theme = useTheme();

    return (
      <div
        css={theme.responsive({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: ['3rem 1.5rem', , '3rem 15px']
        })}
        {...props}
      >
        <div
          css={theme.responsive({
            display: 'flex',
            flexDirection: ['row', 'column-reverse'],
            alignItems: 'center',
            maxWidth: '1024px'
          })}
        >
          <div css={theme.responsive({marginTop: [0, '3rem'], textAlign: ['left', 'center']})}>
            <h2
              css={theme.responsive({
                fontSize: [, , '1.953rem', '1.563rem'],
                lineHeight: '1.45'
              })}
            >
              Dramatically Simplify Full‑Stack Development
            </h2>
            <div
              css={theme.responsive({
                fontSize: ['1.563rem', , , '1.25rem'],
                color: theme.colors.text.muted
              })}
            >
              Inherit your frontend from your backend and build an application as if it were made of
              a single layer.
            </div>
            <Button
              onClick={() => {
                this.Docs.MainPage.navigate();
              }}
              size="large"
              color="secondary"
              css={{marginTop: '2rem'}}
            >
              Get started
            </Button>
          </div>

          <img
            src={typicalVsLayr}
            alt="Typical stack vs Layr stack"
            css={theme.responsive({marginLeft: ['2.5rem', 0], maxWidth: [500, , '100%']})}
          />
        </div>
      </div>
    );
  }

  @view() static ScrollerView({id}: {id: string}) {
    const theme = useTheme();

    return (
      <div css={{alignSelf: 'center', marginBottom: '1.75rem', lineHeight: 1}}>
        <a
          href={`#${id}`}
          onClick={(event) => {
            const element = document.getElementById(id);
            if (element) {
              event.preventDefault();
              element.scrollIntoView({block: 'start', behavior: 'smooth'});
            }
          }}
          css={{
            'color': theme.colors.text.muted,
            ':hover': {color: theme.colors.text.normal, textDecoration: 'none'}
          }}
        >
          ▼
        </a>
      </div>
    );
  }

  @view() static NoWebAPIView() {
    return (
      <FeatureSection
        title="Look Ma, No Web API"
        description="Stop wasting your time building a web API. With Layr, the frontend and the backend can [communicate directly](/blog/articles/Do-We-Really-Need-A-Web-API-yq12wz) as if they were not separated."
      >
        <div css={{marginTop: '3rem', maxWidth: 640}}>
          <h5 css={{marginTop: '2rem'}}>Backend</h5>
          <Markdown>{NO_WEB_API_BACKEND_EXAMPLE}</Markdown>
          <h5 css={{marginTop: '2rem'}}>Frontend</h5>
          <Markdown>{NO_WEB_API_FRONTEND_EXAMPLE}</Markdown>
        </div>
      </FeatureSection>
    );
  }

  @view() static ORMView() {
    return (
      <FeatureSection
        title="Abstracted Away Database"
        description={
          "Extend your classes with the [`Storable()`](/docs/v1/reference/storable) mixin, register them into a [store](/docs/v1/reference/store), and you're ready to build your application without having to worry about the database."
        }
      >
        <div css={{marginTop: '3rem', maxWidth: 640}}>
          <h5 css={{marginTop: '2rem'}}>Data Modeling</h5>
          <Markdown>{ORM_DATA_MODELING_EXAMPLE}</Markdown>
          <h5 css={{marginTop: '2rem'}}>Store Registration</h5>
          <Markdown>{ORM_STORE_REGISTRATION_EXAMPLE}</Markdown>
          <h5 css={{marginTop: '2rem'}}>CRUD Operations</h5>
          <Markdown>{ORM_STORE_CRUD_OPERATIONS_EXAMPLE}</Markdown>
          <h5 css={{marginTop: '2rem'}}>Finding Data</h5>
          <Markdown>{ORM_STORE_FINDING_DATA_EXAMPLE}</Markdown>
        </div>
      </FeatureSection>
    );
  }

  @view() static UserInterfaceView() {
    return (
      <FeatureSection
        title="Encapsulated User Interface"
        description={
          'Implement your [routes](/docs/v1/reference/routable) and [views](/docs/v1/reference/react-integration#view-decorator) as methods of your models, and keep your application as cohesive as possible.'
        }
      >
        <div css={{marginTop: '3rem', maxWidth: 640}}>
          <h5 css={{marginTop: '2rem'}}>Routes</h5>
          <Markdown>{USER_INTERFACE_ROUTES_EXAMPLE}</Markdown>
          <h5 css={{marginTop: '2rem'}}>Views</h5>
          <Markdown>{USER_INTERFACE_VIEWS_EXAMPLE}</Markdown>
        </div>
      </FeatureSection>
    );
  }

  @view() static DeveloperExperienceView() {
    return (
      <FeatureSection
        title="Delightful Developer Experience"
        description={
          'Layr strives to find the right balance between powerful abstractions and ease of use so that you can build an application in the most enjoyable way possible.'
        }
      >
        <Button
          onClick={() => {
            this.Docs.MainPage.navigate();
          }}
          size="large"
          color="secondary"
          css={{marginTop: '2rem'}}
        >
          Read the docs
        </Button>
      </FeatureSection>
    );
  }
}

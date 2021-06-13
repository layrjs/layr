import {useMemo} from 'react';
import {useDelay} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';
import {useWindowHeight} from '@react-hook/window-size';
import {Helmet} from 'react-helmet';

import {InlineMarkdown} from './markdown';
import somethingWrong from './assets/something-wrong.png';

export function FullHeight({
  id,
  className,
  children
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const height = useWindowHeight({initialHeight: 600});

  return (
    <div id={id} className={className} css={{minHeight: height}}>
      {children}
    </div>
  );
}

export function FeatureSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <div
      css={theme.responsive({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: ['3rem 1.5rem', , '3rem 15px']
      })}
    >
      <div css={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <h3
          css={theme.responsive({
            fontSize: [, , '1.563rem'],
            textAlign: 'center'
          })}
        >
          {title}
        </h3>
        <div
          css={theme.responsive({
            fontSize: ['1.25rem', , '1rem'],
            color: theme.colors.text.muted,
            textAlign: 'center'
          })}
        >
          <InlineMarkdown>{description}</InlineMarkdown>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Title({children: title}: {children?: string}) {
  if (title === undefined) {
    title = 'Layr';
  } else {
    title = 'Layr – ' + title;
  }

  return (
    <Helmet>
      <title>{title}</title>
    </Helmet>
  );
}

export function ErrorMessage({children}: {children: string | (Error & {displayMessage?: string})}) {
  const message = typeof children === 'string' ? children : formatError(children);

  return (
    <div
      css={{
        width: '100%',
        padding: '3rem 15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <img src={somethingWrong} alt="Something went wrong" css={{width: 350, maxWidth: '100%'}} />
      <h4 css={{marginTop: '3rem', textAlign: 'center'}}>{message}</h4>
    </div>
  );
}

export function formatError(error: Error & {displayMessage?: string}) {
  return error?.displayMessage ?? 'Sorry, something went wrong.';
}

export function LoadingSpinner({delay}: {delay?: number}) {
  const style = useMemo(
    () => ({
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      margin: '90px auto',
      position: 'relative' as const,
      borderTop: '3px solid rgba(0, 0, 0, 0.1)',
      borderRight: '3px solid rgba(0, 0, 0, 0.1)',
      borderBottom: '3px solid rgba(0, 0, 0, 0.1)',
      borderLeft: '3px solid #818a91',
      transform: 'translateZ(0)',
      animation: 'loading-spinner 0.5s infinite linear'
    }),
    []
  );

  return (
    <Delayed duration={delay}>
      <div className="loading-spinner" style={style}>
        <style>
          {`
        @keyframes loading-spinner {
          0% {transform: rotate(0deg);}
          100% {transform: rotate(360deg);}
        }
        `}
        </style>
      </div>
    </Delayed>
  );
}

export function Delayed({
  duration = 500,
  children
}: {
  duration?: number;
  children: React.ReactElement;
}) {
  const [isElapsed] = useDelay(duration);

  if (isElapsed) {
    return children;
  }

  return null;
}

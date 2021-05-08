import {jsx} from '@emotion/core';
import useMetaTags from 'react-metatags-hook';

import {UI} from './components/ui';

export function FeatureSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const theme = UI.useTheme();

  return (
    <div
      css={UI.responsive({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: ['3rem 1.5rem', , '3rem 15px']
      })}
    >
      <div css={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <h3
          css={UI.responsive({
            fontSize: [, , '1.563rem'],
            textAlign: 'center'
          })}
        >
          {title}
        </h3>
        <div
          css={UI.responsive({
            fontSize: ['1.25rem', , '1rem'],
            color: theme.muted.textColor,
            textAlign: 'center'
          })}
        >
          <UI.InlineMarkdown>{description}</UI.InlineMarkdown>
        </div>
        {children}
      </div>
    </div>
  );
}

export function useTitle(title?: string) {
  if (title === undefined) {
    title = 'Layr';
  } else {
    title = 'Layr – ' + title;
  }

  useMetaTags({title}, [title]);
}

import { ContainerProps } from '@mantine/core';
import { MasonryContainer } from '~/components/MasonryColumns/MasonryContainer';
import React from 'react';
import { AdUnit } from '~/components/Ads/AdUnit';

export const HomeBlockWrapper = ({ children, showAds, ...props }: Props) => {
  return (
    <MasonryContainer {...props}>
      {children}
      {showAds && <AdUnit keys={['Dynamic_Leaderboard_C']} />}
    </MasonryContainer>
  );
};

type Props = ContainerProps & { showAds?: boolean };

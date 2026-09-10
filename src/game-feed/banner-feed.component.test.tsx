import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import BannerFeed from './banner-feed.component';
import { renderWithStore } from '../test/renderWithStore';

describe('BannerFeed', () => {
    it('renders nothing when there is no banner', () => {
        const { container } = renderWithStore(<BannerFeed />, { feed: { current: null } });
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the current banner text', () => {
        renderWithStore(<BannerFeed />, { feed: { current: { text: 'TANK DOWN!', id: 3 } } });
        expect(screen.getByText('TANK DOWN!')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('TANK DOWN!');
    });
});

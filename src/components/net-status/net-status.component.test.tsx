import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import NetStatus from './net-status.component';
import { makeFakeNetClient } from '../../test/fakeNetClient';

describe('NetStatus', () => {
    it('shows a placeholder ping before the first pong', () => {
        render(<NetStatus client={makeFakeNetClient({ latencyMs: null })} />);
        expect(screen.getByText('⚡—')).toBeInTheDocument();
    });

    it('shows the measured latency in ms', () => {
        render(<NetStatus client={makeFakeNetClient({ latencyMs: 37 })} />);
        expect(screen.getByText('⚡37ms')).toBeInTheDocument();
    });

    it('reflects the peer connection state', () => {
        const client = makeFakeNetClient({ peerConnected: false });
        render(<NetStatus client={client} />);
        expect(screen.getByText('P2○')).toHaveClass('net-peer-down');

        act(() => client._set({ peerConnected: true }));
        expect(screen.getByText('P2●')).toHaveClass('net-peer-up');
    });
});

import { describe, expect, it } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import NetworkLobby from './network-lobby.component';
import { makeFakeNetClient } from '../../test/fakeNetClient';

describe('NetworkLobby', () => {
    it('shows CONNECTING while the socket is opening', () => {
        render(<NetworkLobby client={makeFakeNetClient({ phase: 'connecting' })} />);
        expect(screen.getByText(/CONNECTING/i)).toBeInTheDocument();
    });

    it('shows the waiting-for-player-2 screen with room + slot, and wires the buttons', () => {
        const client = makeFakeNetClient({ phase: 'lobby', roomId: 'default', playerId: 1 });
        render(<NetworkLobby client={client} />);

        expect(screen.getByText('WAITING FOR PLAYER 2')).toBeInTheDocument();
        expect(screen.getByText(/room: default/)).toBeInTheDocument();
        expect(screen.getByText(/you are P2/)).toBeInTheDocument();

        fireEvent.click(screen.getByText('START SOLO'));
        expect(client.start).toHaveBeenCalledWith(1);

        fireEvent.click(screen.getByText('BACK'));
        expect(client.returnToMenu).toHaveBeenCalled();
    });

    it('shows the connection-lost screen with the reconnect attempt count', () => {
        const client = makeFakeNetClient({ phase: 'reconnecting', reconnectAttempt: 2 });
        render(<NetworkLobby client={client} />);

        expect(screen.getByText('CONNECTION LOST')).toBeInTheDocument();
        expect(screen.getByText(/attempt 2/)).toBeInTheDocument();
        fireEvent.click(screen.getByText('BACK TO MENU'));
        expect(client.returnToMenu).toHaveBeenCalled();
    });

    it('reacts to a live phase change', () => {
        const client = makeFakeNetClient({ phase: 'connecting' });
        render(<NetworkLobby client={client} />);
        expect(screen.getByText(/CONNECTING/i)).toBeInTheDocument();

        act(() => client._set({ phase: 'lobby' }));
        expect(screen.getByText('WAITING FOR PLAYER 2')).toBeInTheDocument();
    });
});

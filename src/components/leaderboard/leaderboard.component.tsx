import { useEffect, useState } from 'react';
import Button from '../button/button.component';
import { fetchLeaderboard } from '../../services/api';
import type { ScoreRow } from '../../net/apiTypes';

import './leaderboard.styles.scss';

interface LeaderboardProps {
    onClose: () => void;
    /** Optional row to highlight (the score just submitted). */
    highlightId?: string;
}

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ok'; rows: ScoreRow[] };

const Leaderboard = ({ onClose, highlightId }: LeaderboardProps) => {
    const [load, setLoad] = useState<Load>({ status: 'loading' });

    useEffect(() => {
        const ctrl = new AbortController();
        fetchLeaderboard({ limit: 20 }, ctrl.signal)
            .then((rows) => setLoad({ status: 'ok', rows }))
            .catch(() => {
                if (!ctrl.signal.aborted) setLoad({ status: 'error' });
            });
        return () => ctrl.abort();
    }, []);

    return (
        <div className="leaderboard-container">
            <h2 className="leaderboard-title">HIGH SCORES</h2>

            {load.status === 'loading' && <p className="leaderboard-msg">LOADING…</p>}
            {load.status === 'error' && <p className="leaderboard-msg">SCORES UNAVAILABLE</p>}
            {load.status === 'ok' && load.rows.length === 0 && (
                <p className="leaderboard-msg">NO SCORES YET</p>
            )}
            {load.status === 'ok' && load.rows.length > 0 && (
                <table className="leaderboard-table">
                    <tbody>
                        {load.rows.map((row, i) => (
                            <tr key={row.id} className={row.id === highlightId ? 'is-me' : undefined}>
                                <td className="rank">{i + 1}</td>
                                <td className="name">{row.name}</td>
                                <td className="score">{row.score.toLocaleString()}</td>
                                <td className="lvl">LV {row.level}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <Button id="leaderboard-close" clickFunction={onClose}>BACK</Button>
        </div>
    );
};

export default Leaderboard;

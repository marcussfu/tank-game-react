
import enemyTank from '../../assets/tiles/enemy-tank.png';
import playerTank from '../../assets/tiles/player-tank.png';
import star from '../../assets/tiles/star.png';
import eagle from '../../assets/tiles/eagle.png';

import './game-intro.styles.scss';

const GameIntro = () => {
    return (
        <div className='game-intro-container'>
            <div className='col-md-4'>
                <h4 className='pad-20'>Operation:</h4>
                <ul>
                    <li>move up: &uarr; </li>        
                    <li>move down: &darr; </li>        
                    <li>move left: &larr; </li>        
                    <li>move right: &rarr; </li>
                    <li>open fire: <strong>space key</strong> </li>
                </ul>
            </div>
            <div className='col-md-4'>
                <h4>To win:</h4>
                <p>
                    Eliminate all enemy tanks 
                    <img alt="enemyTank" src={enemyTank} />
                </p>
                <strong>Or</strong>
                <p>
                    Find and catch the star
                    <img alt='star' src={star} />
                </p>
            </div>      
            <div className='col-md-4'>
                <h4>To lose:</h4>
                <p>Player tank <img alt="playerTank" src={playerTank} /> is shot</p>
                <strong>Or</strong>
                <p>The eagle base <img alt="eagle" src={eagle} width="20px"/> is destroyed</p>
            </div>
        </div>
    )
};

export default GameIntro;
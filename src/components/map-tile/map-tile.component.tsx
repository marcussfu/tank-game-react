import './map-tile.styles.scss';

interface MapTileProps {
    tile: string;
}

const MapTile = ({tile}: MapTileProps) => {
    return <div className={`tile ${tile}`} />
}

export default MapTile;
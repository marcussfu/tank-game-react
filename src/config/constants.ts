import type { Position } from './types';

export const SPRITE_SIZE = 20;
export const MAP_HEIGHT = SPRITE_SIZE * 24;
export const MAP_WIDTH = SPRITE_SIZE * 40;
export const FLAG_POSITION: Position[] = [[22,16],[22,17],[23,16],[23,17]];
export const TIME_LIMIT = 180;

export const getTileUrl = (type: number): string => {
    switch (type) {
        case 0:
          return ''
        case 1:
          return '../../assets/tiles/shelter.png'
        case 4:
          return '../../assets/tiles/star.png'
        case 5:
          return '../../assets/tiles/wall.png'
        case 6:
          return '../../assets/tiles/rock.png'
        case 7:
          return '../../assets/tiles/water.png'
        case 8:
          return '../../assets/tiles/rock-cube.png'
        case 9:
          return '../../assets/tiles/boom.png'
        case 10:
          return '../../assets/tiles/eagle.png'
        // case 10.1:
        //   return 'eagle left-top'
        // case 10.2:
        //   return 'eagle right-top'
        // case 10.3:
        //   return 'eagle left-bottom'
        // case 10.4:
        //   return 'eagle right-bottom'
        case 11:
          return '../../assets/tiles/flag.png'
        // case 11.1:
        //   return 'flag left-top'
        // case 11.2:
        //   return 'flag right-top'
        // case 11.3:
        //   return 'flag left-bottom'
        // case 11.4:
        //   return 'flag right-bottom'
        // case 12:
        //   return 'star-wall'
        default:
          return ''
    }
};

export const getTileSprite = (type: number): string => {
    switch (type) {
      case 0:
        return 'grass'
      case 1:
        return 'shelter'
      case 4:
        return 'star'
      case 5:
        return 'wall'
      case 6:
        return 'rock'
      case 7:
        return 'water'
      case 8:
        return 'rock-cube'
      case 9:
        return 'boom'
      case 10:
        return 'eagle'
      case 10.1:
        return 'eagle left-top'
      case 10.2:
        return 'eagle right-top'
      case 10.3:
        return 'eagle left-bottom'
      case 10.4:
        return 'eagle right-bottom'
      case 11:
        return 'flag'
      case 11.1:
        return 'flag left-top'
      case 11.2:
        return 'flag right-top'
      case 11.3:
        return 'flag left-bottom'
      case 11.4:
        return 'flag right-bottom'
      case 12:
        return 'star-wall'
      default:
        return 'grass'
    }
}

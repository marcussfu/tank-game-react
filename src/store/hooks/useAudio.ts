import {useCallback, useEffect, useRef} from 'react';

interface UseAudioOptions {
    volume?: number;
    playbackRate?: number;
    loop?: boolean;
}

const useAudio = (src: string, options: UseAudioOptions) => {
    const {volume=1, playbackRate=1, loop=false} = options;
    const sound = useRef(new Audio(src));

    useEffect(() => {
        sound.current.playbackRate = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
        sound.current.volume = volume;
    }, [volume]);

    useEffect(() => {
        sound.current.loop = loop;
    }, [loop]);

    const play = useCallback(() => {
        sound.current.play();
    }, []);

    const replay = useCallback(() => {
        sound.current.currentTime = 0;
        sound.current.play();
    }, []);

    return {play, replay};
};

export default useAudio;

import { useState } from "react";
import { useEffect } from "react";
// import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import VolumeDown from '@mui/icons-material/VolumeDown';
import VolumeUp from '@mui/icons-material/VolumeUp';

interface VolumeProperty {
    audioTitle: string;
    volumeValue: number;
    setAudioVolumeFunc: (value: number) => void;
}

interface VolumeSliderProps {
    volumeProperty: VolumeProperty;
}

const VolumeSlider = ({volumeProperty}: VolumeSliderProps) => {
    const {audioTitle, volumeValue, setAudioVolumeFunc} = volumeProperty;
    const [value, setValue] = useState(volumeValue * 100);

    useEffect(() => {
        const normal_value = (value-0)/(100-0);
        setAudioVolumeFunc(normal_value);
    }, [value]);

    const handleChange = (_event: Event, newValue: number | number[]) => {
        setValue(newValue as number);
    };

    return (
        // <Box sx={{ width: 200 }}>
          <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
            {audioTitle}
            <VolumeDown />
            <Slider aria-label="Volume" value={value} onChange={handleChange} />
            <VolumeUp />
          </Stack>
        // </Box>
    );
};

export default VolumeSlider;
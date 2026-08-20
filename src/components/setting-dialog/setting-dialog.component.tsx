import { useState, Fragment } from 'react';
import {useAppSelector} from '../../store/hooks';
import {useActions} from '../../store/hooks/useActions';

import SettingsIcon from '@mui/icons-material/Settings';
import { styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import type { DialogTitleProps } from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import VolumeSlider from '../../components/volume-slider/volume-slider.component';

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
  '& .MuiDialog-container': {
    '& .MuiPaper-root': {
      width: "100%",
      maxWidth: "550px",  // Set your width here
    },
  },
}));

interface BootstrapDialogTitleProps extends Omit<DialogTitleProps, 'onClose'> {
  onClose: () => void;
}

function BootstrapDialogTitle(props: BootstrapDialogTitleProps) {
  const { children, onClose, ...other } = props;

  return (
    <DialogTitle sx={{ m: 0, p: 2 }} {...other}>
      {children}
      {onClose ? (
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </DialogTitle>
  );
}

const SettingDialog = () => {
  const [open, setOpen] = useState(false);
  const {bgVolume, effectVolume} = useAppSelector(state => state.settingReducer);
  const {setBgVolume, setEffectVolume} = useActions();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const setBgVolumeHandler = (value: number) => {
    setBgVolume(value);
  };

  const setEffectVolumeHandler = (value: number) => {
    setEffectVolume(value);
  };

  return (
    <Fragment>
      <IconButton color="primary" aria-label="go to setting" onClick={handleClickOpen}>
        <SettingsIcon />
      </IconButton>
      <BootstrapDialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <BootstrapDialogTitle id="customized-dialog-title" onClose={handleClose}>
          Setting
        </BootstrapDialogTitle>
        <DialogContent dividers>
          <VolumeSlider volumeProperty={{audioTitle: 'BG', volumeValue: bgVolume, setAudioVolumeFunc: setBgVolumeHandler}}/>
          <VolumeSlider volumeProperty={{audioTitle: 'Shoot', volumeValue: effectVolume, setAudioVolumeFunc: setEffectVolumeHandler}}/>
        </DialogContent>
        {/* <DialogActions>
          <Button autoFocus onClick={handleClose}>
            Save
          </Button>
        </DialogActions> */}
      </BootstrapDialog>
    </Fragment>
  )
};

export default SettingDialog;

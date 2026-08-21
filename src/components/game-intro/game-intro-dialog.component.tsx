import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import GameIntro from './game-intro.component';

interface GameIntroDialogProps {
    open: boolean;
    onClose: () => void;
}

const GameIntroDialog = ({ open, onClose }: GameIntroDialogProps) => (
    <Dialog onClose={onClose} open={open} maxWidth="md" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2 }}>
            Operation Manual
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
        </DialogTitle>
        <DialogContent dividers>
            <GameIntro />
        </DialogContent>
    </Dialog>
);

export default GameIntroDialog;

import React from 'react';
import { Group, Button } from '@mantine/core';

const ModalComponent = ({ onClose, handleSave, loading, confirmText }) => {
    return (
        <Group justify="flex-end" pt="md">
            <Button
                variant="outline"
                onClick={onClose}
                className="ipam-cancel-button"
            >
                Cancel
            </Button>
            <Button
                onClick={handleSave}
                loading={loading}
                className="ipam-confirm-button"
            >
                {confirmText || 'Confirm'}
            </Button>
        </Group>
    );
};

export default ModalComponent; 
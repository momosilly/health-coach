import { Host, DropdownMenu, DropdownMenuItem, OutlinedButton, Text } from "@expo/ui/jetpack-compose";
import { useState } from "react";

type DropdownProps = {
    disabled?: boolean;
    value?: string;
    onSelectSex?: (sex: string) => void;
}

export default function Dropdown({ disabled = false, value = '', onSelectSex }: DropdownProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const selectSex = (val: string) => {
        setIsExpanded(false);
        onSelectSex?.(val);
    }

    return (
        <Host matchContents>
            <DropdownMenu expanded={isExpanded} onDismissRequest={() => setIsExpanded(false)}>
                <DropdownMenu.Trigger>
                    <OutlinedButton onClick={() => {
                        if (disabled) return
                        setIsExpanded(true)
                        }}
                        enabled={!disabled}    
                    >
                        <Text>{value ? value : 'Select sex'}</Text>
                    </OutlinedButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                    <DropdownMenuItem onClick={() => selectSex('Male')}>
                        <DropdownMenuItem.Text>
                            <Text>Male</Text>
                        </DropdownMenuItem.Text>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectSex('Female')}>
                        <DropdownMenuItem.Text>
                            <Text>Female</Text>
                        </DropdownMenuItem.Text>
                    </DropdownMenuItem>
                </DropdownMenu.Items>
            </DropdownMenu>
        </Host>
    )
}
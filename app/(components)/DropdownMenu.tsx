import { Host, DropdownMenu, DropdownMenuItem, OutlinedButton, Text } from "@expo/ui/jetpack-compose";
import { disabled } from "@expo/ui/swift-ui/modifiers";
import { useState } from "react";

type DropdownProps = {
    disabled?: boolean
}

export default function Dropdown({ disabled = false }: DropdownProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [sex, setSex] = useState('')

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
                        <Text>{sex ? sex : 'Select sex'}</Text>
                    </OutlinedButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                    <DropdownMenuItem
                        onClick={() => {
                            setIsExpanded(false);
                            setSex('Man')
                        }}
                    >
                        <DropdownMenuItem.Text>
                            <Text>Man</Text>
                        </DropdownMenuItem.Text>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => {
                            setIsExpanded(false)
                            setSex('Woman')
                        }}
                    >
                        <DropdownMenuItem.Text>
                            <Text>Woman</Text>
                        </DropdownMenuItem.Text>
                    </DropdownMenuItem>
                </DropdownMenu.Items>
            </DropdownMenu>
        </Host>
    )
}
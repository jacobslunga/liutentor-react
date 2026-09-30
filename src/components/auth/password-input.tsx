import { TextInput, type TextInputProps } from "@primer/react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

export function PasswordInput(props: Omit<TextInputProps, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <TextInput
      block
      type={visible ? "text" : "password"}
      placeholder="••••••••"
      trailingAction={
        <TextInput.Action
          icon={visible ? EyeOffIcon : EyeIcon}
          aria-label={visible ? "Dölj lösenord" : "Visa lösenord"}
          onClick={() => setVisible((v) => !v)}
        />
      }
      {...props}
    />
  );
}

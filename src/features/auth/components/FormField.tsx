import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import type { TextInputProps } from "react-native";
import { TextField } from "@/core/components";

/** React Hook Form + TextField in one line per field. */
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  ...inputProps
}: { control: Control<T>; name: Path<T>; label: string; hint?: string } & Omit<
  TextInputProps,
  "value" | "onChangeText"
>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <TextField
          label={label}
          value={(value as string | undefined) ?? ""}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          hint={hint}
          {...inputProps}
        />
      )}
    />
  );
}

"use client";

import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Phone number input with a searchable country-code selector.
 *
 * Built on `react-phone-number-input`. The `value` / `onChange` contract is
 * always a single E.164 string (e.g. "+94771234567"), or "" when empty.
 *
 * The outer wrapper owns the border + focus ring so the country button and
 * the text input read as one field, matching the shared `Input` styling.
 */

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange" | "value"> & {
    value?: string;
    onChange?: (value: string) => void;
  };

const PhoneInput = React.forwardRef<
  React.ElementRef<typeof RPNInput.default>,
  PhoneInputProps
>(({ className, onChange, value, disabled, ...props }, ref) => (
  <RPNInput.default
    ref={ref}
    className={cn(
      // Mirrors inputVariants: border, radius, height, transition, focus ring
      "flex h-9 w-full min-w-0 items-stretch rounded-md border border-input bg-transparent shadow-none transition-[color,box-shadow]",
      "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-destructive/20 dark:has-[input[aria-invalid=true]]:ring-destructive/40",
      "focus-within:!border-ring focus-within:!ring-ring/50 focus-within:!ring-[3px]",
      disabled && "pointer-events-none cursor-not-allowed opacity-50",
      className
    )}
    flagComponent={FlagComponent}
    countrySelectComponent={CountrySelect}
    inputComponent={InnerInput}
    smartCaret={false}
    international
    countryCallingCodeEditable={false}
    disabled={disabled}
    value={(value || undefined) as RPNInput.Value | undefined}
    // RPN emits E.164 (or undefined); normalise empty to "" for the form.
    onChange={(v) => onChange?.(v ?? "")}
    {...props}
  />
));
PhoneInput.displayName = "PhoneInput";

// ─── Inner text input (borderless; wrapper handles border/ring) ─────────────

const InnerInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    data-slot="input"
    className={cn(
      "flex h-full w-full min-w-0 rounded-e-md bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground md:text-sm",
      className
    )}
    {...props}
  />
));
InnerInput.displayName = "PhoneInnerInput";

// ─── Searchable country selector ────────────────────────────────────────────

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

function CountrySelect({
  disabled,
  value: selectedCountry,
  options,
  onChange,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  return (
    <Popover
      open={open}
      modal
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Select country code"
          className="flex shrink-0 items-center gap-1 rounded-s-md border-e border-input px-3 text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent disabled:cursor-not-allowed"
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search country or code…"
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {options
                .filter(
                  (o): o is { label: string; value: RPNInput.Country } =>
                    !!o.value
                )
                .map(({ value, label }) => {
                  const code = RPNInput.getCountryCallingCode(value);
                  return (
                    <CommandItem
                      key={value}
                      // Searchable by name, ISO code and dial code
                      value={`${label} ${value} +${code}`}
                      onSelect={() => {
                        onChange(value);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="gap-2"
                    >
                      <FlagComponent country={value} countryName={label} />
                      <span className="flex-1 truncate">{label}</span>
                      <span className="text-sm text-muted-foreground">
                        +{code}
                      </span>
                      <Check
                        className={cn(
                          "ml-1",
                          value === selectedCountry ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Flag ───────────────────────────────────────────────────────────────────

function FlagComponent({ country, countryName }: RPNInput.FlagProps) {
  const Flag = country ? flags[country] : undefined;
  return (
    <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-[2px] bg-foreground/10 [&_svg]:!size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
}

export { PhoneInput };

// 'use client';

// import {
//   ColorPicker,
//   ColorPickerAlpha,
//   ColorPickerEyeDropper,
//   ColorPickerFormat,
//   ColorPickerHue,
//   ColorPickerOutput,
//   ColorPickerSelection,
// } from '@/components/ui/shadcn-io/color-picker';

// export default function CustomColorPicker({
//   onChange,
// }: {
//   onChange?: (color: string) => void;
// }) {
//   return (
//     <ColorPicker
//       className="max-w-sm rounded-md border bg-background p-4 shadow-sm"
//       onChange={(color) => onChange?.(color)}
//     >
//       <ColorPickerSelection />
//       <div className="flex items-center gap-4">
//         <ColorPickerEyeDropper />
//         <div className="grid w-full gap-1">
//           <ColorPickerHue />
//           <ColorPickerAlpha />
//         </div>
//       </div>
//       <div className="flex items-center gap-2">
//         <ColorPickerOutput />
//         <ColorPickerFormat />
//       </div>
//     </ColorPicker>
//   );
// }


'use client';

import React from 'react';
import ColorPicker from '@rc-component/color-picker';
import '@rc-component/color-picker/assets/index.css';

interface CustomColorPickerProps {
  onChange: (color: string) => void;
}

const CustomColorPicker: React.FC<CustomColorPickerProps> = ({ onChange }) => {
  return (
    <ColorPicker
      // rc-color-picker gives color as an object, we can convert it to hex
      onChange={(colors) => {
        const hex = colors?.toHexString?.() || '#000000';
        onChange(hex);
      }}
    />
  );
};

export default CustomColorPicker;

// components/TiptapEditor.tsx
import React, { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline"; // Import Underline extension
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  Paperclip,
  UnderlineIcon,
  X,
} from "lucide-react";
import { Button } from "./button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Input } from "./input";

interface RichTextEditorProps {
  borderColor?: string; // Optional borderColor prop
  createNote: (content: string, files: Blob[]) => void;
  handleCancel: () => void;
}
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  borderColor = "border-gray-300",
  createNote,
  handleCancel,
}) => {
  const [content, setContent] = useState<string>("<p></p>");
  const [fileList, setFileList] = useState<File[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["paragraph", "heading"],
      }),
      Underline, // Add the Underline extension here
    ],
    content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  // Handle submit function
  const handleSubmit =async () => {
       createNote(content, fileList);
      setFileList([])
      editor?.commands.clearContent(true);
      setContent("<p></p>");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFileList([...fileList, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setFileList(fileList.filter((_, i) => i !== index));
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <div className="flex space-x-2 mb-4">
        {/* Bold button */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <BoldIcon size={16} />
        </button>

        {/* Italic button */}
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <ItalicIcon size={16} />
        </button>

        {/* Underline button */}
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()} // Now this will work
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <UnderlineIcon size={16} />
        </button>

        {/* Bullet List button */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <ListIcon size={16} />
        </button>

        {/* Ordered List button */}
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <ListOrderedIcon size={16} />
        </button>

        {/* Text alignment buttons */}
        <button
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <AlignLeftIcon size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <AlignCenterIcon size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <AlignRightIcon size={16} />
        </button>
      </div>

      {/* Editor Content */}
      {/* <div className="border border-gray-300 p-4 rounded-md"> */}
      <div className={`border p-4 rounded-md ${borderColor}`}>
        <EditorContent className="text-xs" editor={editor} value={content}/>
      </div>

      {/* Submit Button */}

      <div className="mt-4 flex justify-end gap-4">
        <div className="mr-auto">
          <label htmlFor="attachment" className="cursor-pointer">
            <div className="border text-xs border-gray-300 rounded-md px-2 py-1 flex flex-row font-normal items-center hover:bg-gray-100">
              <Paperclip size={16} className="mr-2" />
              Attachments
            </div>
          </label>

          <input
            id="attachment"
            type="file"
            accept=".png,.jpg,.pdf,.docx"
            className="hidden"
            multiple
            onChange={handleFileChange}
          />
        </div>

        <Button
          variant="default"
          onClick={handleCancel}
          className="px-2 h-6 text-xs  bg-gray-600  text-white rounded hover:bg-gray-700 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleSubmit}
          className="px-2 h-6 text-xs  text-white rounded hover:bg-gray-700 cursor-pointer"
        >
          Submit
        </Button>
      </div>
      <div className="w-full flex flex-wrap gap-2">
        {/* Display Uploaded File Names */}
        {fileList.length > 0 && (
          <div className="flex flex-wrap gap-2 ">
            {fileList.map((file, index) => (
              <div
                key={index}
                className="text-[10px] italic text-sky-800  border-gray-300 rounded-full inline-flex items-center py-1 px-2 "
              >
                {file.name}
                <X
                  size={12}
                  className="ml-1 hover:text-red-500 cursor-pointer"
                  onClick={() => removeFile(index)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;

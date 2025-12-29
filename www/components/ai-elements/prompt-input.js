"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePromptInputController = exports.PromptInputSubmit = exports.PromptInputButton = exports.PromptInputSpeechButton = exports.PromptInputActionAddAttachments = exports.PromptInputActionMenuContent = exports.PromptInputActionMenuTrigger = exports.PromptInputActionMenu = exports.PromptInputTools = exports.PromptInputFooter = exports.PromptInputTextarea = exports.PromptInputBody = exports.PromptInputAttachment = exports.PromptInputAttachments = exports.PromptInput = exports.PromptInputProvider = void 0;
const React = __importStar(require("react"));
const PromptInputProvider = ({ children }) => <div>{children}</div>;
exports.PromptInputProvider = PromptInputProvider;
const PromptInput = ({ children, onSubmit }) => (<div className="border p-4 rounded-lg shadow-sm bg-white">
    {children}
  </div>);
exports.PromptInput = PromptInput;
const PromptInputAttachments = ({ children }) => <div>{children}</div>;
exports.PromptInputAttachments = PromptInputAttachments;
const PromptInputAttachment = ({ data }) => <div>Attachment</div>;
exports.PromptInputAttachment = PromptInputAttachment;
const PromptInputBody = ({ children }) => <div className="my-2">{children}</div>;
exports.PromptInputBody = PromptInputBody;
exports.PromptInputTextarea = React.forwardRef((props, ref) => (<textarea ref={ref} className="w-full border p-2 rounded min-h-[100px]" placeholder="Type a message..." {...props}/>));
exports.PromptInputTextarea.displayName = "PromptInputTextarea";
const PromptInputFooter = ({ children }) => <div className="flex justify-between items-center mt-2">{children}</div>;
exports.PromptInputFooter = PromptInputFooter;
const PromptInputTools = ({ children }) => <div className="flex gap-2 items-center">{children}</div>;
exports.PromptInputTools = PromptInputTools;
const PromptInputActionMenu = ({ children }) => <div className="relative">{children}</div>;
exports.PromptInputActionMenu = PromptInputActionMenu;
const PromptInputActionMenuTrigger = () => <button className="p-2 hover:bg-gray-100 rounded">+</button>;
exports.PromptInputActionMenuTrigger = PromptInputActionMenuTrigger;
const PromptInputActionMenuContent = ({ children }) => <div className="absolute bottom-full mb-2 bg-white border rounded shadow p-2">{children}</div>;
exports.PromptInputActionMenuContent = PromptInputActionMenuContent;
const PromptInputActionAddAttachments = () => <button className="text-sm">Add Attachment</button>;
exports.PromptInputActionAddAttachments = PromptInputActionAddAttachments;
const PromptInputSpeechButton = ({ textareaRef }) => <button className="p-2 hover:bg-gray-100 rounded">🎤</button>;
exports.PromptInputSpeechButton = PromptInputSpeechButton;
const PromptInputButton = ({ children, onClick }) => <button onClick={onClick} className="p-2 border rounded hover:bg-gray-50 flex items-center gap-2 text-sm">{children}</button>;
exports.PromptInputButton = PromptInputButton;
const PromptInputSubmit = ({ status }) => <button className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">{status === 'streaming' ? 'Stop' : 'Send'}</button>;
exports.PromptInputSubmit = PromptInputSubmit;
const usePromptInputController = () => ({
    textInput: {
        clear: () => console.log("Clear input"),
        setInput: (val) => console.log("Set input", val),
    },
    attachments: {
        clear: () => console.log("Clear attachments"),
    }
});
exports.usePromptInputController = usePromptInputController;
//# sourceMappingURL=prompt-input.js.map
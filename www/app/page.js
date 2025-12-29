"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
const model_selector_1 = require("@/components/ai-elements/model-selector");
const prompt_input_1 = require("@/components/ai-elements/prompt-input");
const button_1 = require("@/components/ui/button");
const button_group_1 = require("@/components/ui/button-group");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const models = [
    {
        id: "gpt-4o",
        name: "GPT-4o",
        chef: "OpenAI",
        chefSlug: "openai",
        providers: ["openai", "azure"],
    },
    {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        chef: "OpenAI",
        chefSlug: "openai",
        providers: ["openai", "azure"],
    },
    {
        id: "claude-opus-4-20250514",
        name: "Claude 4 Opus",
        chef: "Anthropic",
        chefSlug: "anthropic",
        providers: ["anthropic", "azure", "google", "amazon-bedrock"],
    },
    {
        id: "claude-sonnet-4-20250514",
        name: "Claude 4 Sonnet",
        chef: "Anthropic",
        chefSlug: "anthropic",
        providers: ["anthropic", "azure", "google", "amazon-bedrock"],
    },
    {
        id: "gemini-2.0-flash-exp",
        name: "Gemini 2.0 Flash",
        chef: "Google",
        chefSlug: "google",
        providers: ["google"],
    },
];
const SUBMITTING_TIMEOUT = 200;
const STREAMING_TIMEOUT = 2000;
const HeaderControls = () => {
    const controller = (0, prompt_input_1.usePromptInputController)();
    return (<header className="mt-8 flex items-center justify-between">
      <p className="text-sm">
        Header Controls via{" "}
        <code className="rounded-md bg-muted p-1 font-bold">
          PromptInputProvider
        </code>
      </p>
      <button_group_1.ButtonGroup>
        <button_1.Button onClick={() => {
            controller.textInput.clear();
        }} size="sm" type="button" variant="outline">
          Clear input
        </button_1.Button>
        <button_1.Button onClick={() => {
            controller.textInput.setInput("Inserted via PromptInputProvider");
        }} size="sm" type="button" variant="outline">
          Set input
        </button_1.Button>

        <button_1.Button onClick={() => {
            controller.attachments.clear();
        }} size="sm" type="button" variant="outline">
          Clear attachments
        </button_1.Button>
      </button_group_1.ButtonGroup>
    </header>);
};
const Example = () => {
    const [model, setModel] = (0, react_1.useState)(models[0].id);
    const [modelSelectorOpen, setModelSelectorOpen] = (0, react_1.useState)(false);
    const [status, setStatus] = (0, react_1.useState)("ready");
    const textareaRef = (0, react_1.useRef)(null);
    const selectedModelData = models.find((m) => m.id === model);
    const handleSubmit = (message) => {
        const hasText = Boolean(message.text);
        const hasAttachments = Boolean(message.files?.length);
        if (!(hasText || hasAttachments)) {
            return;
        }
        setStatus("submitted");
        // eslint-disable-next-line no-console
        console.log("Submitting message:", message);
        setTimeout(() => {
            setStatus("streaming");
        }, SUBMITTING_TIMEOUT);
        setTimeout(() => {
            setStatus("ready");
        }, STREAMING_TIMEOUT);
    };
    return (<div className="size-full p-4">
      <prompt_input_1.PromptInputProvider>
        <prompt_input_1.PromptInput globalDrop multiple onSubmit={handleSubmit}>
          <prompt_input_1.PromptInputAttachments>
            {(attachment) => <prompt_input_1.PromptInputAttachment data={attachment}/>}
          </prompt_input_1.PromptInputAttachments>
          <prompt_input_1.PromptInputBody>
            <prompt_input_1.PromptInputTextarea ref={textareaRef}/>
          </prompt_input_1.PromptInputBody>
          <prompt_input_1.PromptInputFooter>
            <prompt_input_1.PromptInputTools>
              <prompt_input_1.PromptInputActionMenu>
                <prompt_input_1.PromptInputActionMenuTrigger />
                <prompt_input_1.PromptInputActionMenuContent>
                  <prompt_input_1.PromptInputActionAddAttachments />
                </prompt_input_1.PromptInputActionMenuContent>
              </prompt_input_1.PromptInputActionMenu>
              <prompt_input_1.PromptInputSpeechButton textareaRef={textareaRef}/>
              <prompt_input_1.PromptInputButton>
                <lucide_react_1.GlobeIcon size={16}/>
                <span>Search</span>
              </prompt_input_1.PromptInputButton>
              <model_selector_1.ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
                <model_selector_1.ModelSelectorTrigger asChild>
                  <prompt_input_1.PromptInputButton>
                    {selectedModelData?.chefSlug && (<model_selector_1.ModelSelectorLogo provider={selectedModelData.chefSlug}/>)}
                    {selectedModelData?.name && (<model_selector_1.ModelSelectorName>
                        {selectedModelData.name}
                      </model_selector_1.ModelSelectorName>)}
                  </prompt_input_1.PromptInputButton>
                </model_selector_1.ModelSelectorTrigger>
                <model_selector_1.ModelSelectorContent>
                  <model_selector_1.ModelSelectorInput placeholder="Search models..."/>
                  <model_selector_1.ModelSelectorList>
                    <model_selector_1.ModelSelectorEmpty>No models found.</model_selector_1.ModelSelectorEmpty>
                    {["OpenAI", "Anthropic", "Google"].map((chef) => (<model_selector_1.ModelSelectorGroup heading={chef} key={chef}>
                        {models
                .filter((m) => m.chef === chef)
                .map((m) => (<model_selector_1.ModelSelectorItem key={m.id} onSelect={() => {
                    setModel(m.id);
                    setModelSelectorOpen(false);
                }} value={m.id}>
                              <model_selector_1.ModelSelectorLogo provider={m.chefSlug}/>
                              <model_selector_1.ModelSelectorName>{m.name}</model_selector_1.ModelSelectorName>
                              <model_selector_1.ModelSelectorLogoGroup>
                                {m.providers.map((provider) => (<model_selector_1.ModelSelectorLogo key={provider} provider={provider}/>))}
                              </model_selector_1.ModelSelectorLogoGroup>
                              {model === m.id ? (<lucide_react_1.CheckIcon className="ml-auto size-4"/>) : (<div className="ml-auto size-4"/>)}
                            </model_selector_1.ModelSelectorItem>))}
                      </model_selector_1.ModelSelectorGroup>))}
                  </model_selector_1.ModelSelectorList>
                </model_selector_1.ModelSelectorContent>
              </model_selector_1.ModelSelector>
            </prompt_input_1.PromptInputTools>
            <prompt_input_1.PromptInputSubmit status={status}/>
          </prompt_input_1.PromptInputFooter>
        </prompt_input_1.PromptInput>

        <HeaderControls />
      </prompt_input_1.PromptInputProvider>
    </div>);
};
exports.default = Example;
//# sourceMappingURL=page.js.map
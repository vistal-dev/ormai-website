import { Accordion } from "@base-ui/react";

const triggerCls =
  "group flex w-full items-center justify-between gap-4 bg-transparent px-3 py-4 text-left text-sm font-normal text-fg select-none";

const panelCls =
  "h-[var(--accordion-panel-height)] overflow-hidden text-sm text-fg-muted transition-[height] duration-150 ease-[ease-out] data-ending-style:h-0 data-starting-style:h-0";

const itemCls = "border-b border-border last:border-b-0";

const iconCls =
  "ph ph-caret-down transition-transform duration-150 group-data-[panel-open]:rotate-180";

export function Faq() {
  return (
    <Accordion.Root className="flex w-full flex-col">
      <Accordion.Item className={itemCls}>
        <Accordion.Header>
          <Accordion.Trigger className={triggerCls}>
            How does it work?
            <i className={iconCls}></i>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel className={panelCls}>
          <div className="px-3 pb-3">
            this is a placeholder
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item className={itemCls}>
        <Accordion.Header>
          <Accordion.Trigger className={triggerCls}>
            What are common use cases?
            <i className={iconCls}></i>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel className={panelCls}>
          <div className="px-3 pb-3">this is a placeholder</div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item className={itemCls}>
        <Accordion.Header>
          <Accordion.Trigger className={triggerCls}>
            Is it secure?
            <i className={iconCls}></i>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel className={panelCls}>
          <div className="px-3 pb-3">
            this is a placeholder
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item className={itemCls}>
        <Accordion.Header>
          <Accordion.Trigger className={triggerCls}>
            How does it compare to raw SQL?
            <i className={iconCls}></i>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel className={panelCls}>
          <div className="px-3 pb-3">this is a placeholder</div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

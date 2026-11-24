export type ModalFieldKey =
  | 'problemStatus' | 'problemStage' | 'researchRole'
  | 'taskStatus' | 'taskPriority' | 'taskDue'
  | 'currentGate' | 'nextMilestone'
  | 'projectName' | 'projectGoal' | 'firstProblem'
  | 'problemTitle' | 'problemQuestion' | 'taskTitle'
  | 'pendingText' | 'pendingSource' | 'associateProblem';

interface ModalFieldCopy { label: string; description: string; example?: string; }

export function getModalFieldAttributes(options: { key: ModalFieldKey; control: 'input' | 'textarea' | 'select'; required?: boolean }): { controlClass: string; required: boolean; type?: string; label: string } {
  return { controlClass: options.control === 'textarea' ? 'rw-modal-textarea' : 'rw-modal-control', required: options.required === true, type: options.control === 'input' ? 'text' : undefined, label: getModalFieldCopy(options.key).label };
}

const FIELD_COPY: Record<ModalFieldKey, ModalFieldCopy> = {
  problemStatus: { label: '状态', description: '说明这个研究问题当前处于什么生命周期状态。', example: '示例：exploring、active、completed' },
  problemStage: { label: '研究阶段', description: '说明问题当前位于研究流程的哪个阶段。', example: '示例：inbox、analysis、evaluation' },
  researchRole: { label: '资源角色', description: '说明它在研究中的作用：主线、探索支线或暂存。', example: '示例：mainline、probe、parked' },
  taskStatus: { label: '任务状态', description: '说明任务是否仍待处理。', example: '示例：open、done、blocked' },
  taskPriority: { label: '优先级', description: '说明任务的紧急程度，便于安排下一步。', example: '示例：high、medium、low' },
  taskDue: { label: '截止日期', description: '填写任务预计完成日期；可留空。', example: '示例：2026-12-01' },
  currentGate: { label: '当前门槛', description: '填写判断项目能否进入下一阶段必须满足的条件。' },
  nextMilestone: { label: '下一里程碑', description: '填写项目下一步要完成的具体结果。' },
  projectName: { label: '项目名称', description: '给研究项目一个简短、可识别的名称。', example: '示例：性能评估项目' },
  projectGoal: { label: '项目总体目标', description: '说明项目最终要回答或交付什么。' },
  firstProblem: { label: '首个研究问题', description: '填写项目开始时最需要先解决的问题。' },
  problemTitle: { label: '问题标题', description: '用一句短标题概括研究问题。' },
  problemQuestion: { label: '要回答的研究问题', description: '写出这个问题希望通过研究回答的具体内容。' },
  taskTitle: { label: '任务标题', description: '用一句话描述要完成的动作或结果。' },
  pendingText: { label: '待讨论内容', description: '写下需要后续讨论、判断或处理的内容。' },
  pendingSource: { label: '来源', description: '可选：填写来源 URL、笔记路径或参考材料。' },
  associateProblem: { label: '选择研究问题', description: '选择要加入当前项目的问题。' },
};

let fieldId = 0;

export function getModalFieldCopy(key: ModalFieldKey): ModalFieldCopy { return FIELD_COPY[key]; }

export function createModalField(
  container: HTMLElement,
  options: {
    key: ModalFieldKey;
    control: 'input' | 'textarea' | 'select';
    type?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
  },
): { field: HTMLElement; input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement } {
  const copy = getModalFieldCopy(options.key);
  const field = container.createDiv({ cls: 'rw-form-field' });
  const id = `rw-field-${++fieldId}`;
  const label = field.createEl('label', { cls: 'rw-form-label', text: copy.label });
  label.htmlFor = id;
  if (options.required) label.createSpan({ cls: 'rw-form-required', text: '必填' });
  field.createEl('small', { cls: 'rw-form-description', text: copy.description });
  if (copy.example) field.createEl('small', { cls: 'rw-form-example', text: copy.example });
  const attributes = getModalFieldAttributes(options);
  const input = field.createEl(options.control, {
    cls: attributes.controlClass,
    type: options.control === 'input' ? options.type ?? 'text' : undefined,
    value: options.value,
    placeholder: options.placeholder,
  });
  input.id = id;
  input.setAttribute('aria-label', copy.label);
  if (options.required) input.required = true;
  return { field, input };
}

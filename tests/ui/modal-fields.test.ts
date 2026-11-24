import { describe, expect, it } from 'vitest';
import { getModalFieldCopy, getModalFieldAttributes } from '../../src/ui/modals/form-fields';

describe('workbench modal field copy', () => {
  it('explains research problem properties', () => {
    expect(getModalFieldCopy('problemStatus')).toMatchObject({ label: '状态', description: expect.stringContaining('生命周期') });
    expect(getModalFieldCopy('problemStage')).toMatchObject({ label: '研究阶段', description: expect.stringContaining('阶段') });
    expect(getModalFieldCopy('researchRole')).toMatchObject({ label: '资源角色', description: expect.stringContaining('主线') });
  });

  it('explains task and goal fields', () => {
    expect(getModalFieldCopy('taskPriority')).toMatchObject({ label: '优先级', description: expect.stringContaining('紧急') });
    expect(getModalFieldCopy('taskDue')).toMatchObject({ label: '截止日期', example: '示例：2026-12-01' });
    expect(getModalFieldCopy('currentGate')).toMatchObject({ label: '当前门槛', description: expect.stringContaining('判断') });
    expect(getModalFieldCopy('nextMilestone')).toMatchObject({ label: '下一里程碑', description: expect.stringContaining('下一步') });
  });

  it('covers creation forms and optional source input', () => {
    expect(getModalFieldCopy('projectName').label).toBe('项目名称');
    expect(getModalFieldCopy('projectGoal').label).toBe('项目总体目标');
    expect(getModalFieldCopy('problemQuestion').label).toBe('要回答的研究问题');
    expect(getModalFieldCopy('pendingSource').description).toContain('可选');
  });

  it('builds accessible required and optional field attributes', () => {
    expect(getModalFieldAttributes({ key: 'projectName', control: 'input', required: true })).toMatchObject({ controlClass: 'rw-modal-control', required: true, type: 'text', label: '项目名称' });
    expect(getModalFieldAttributes({ key: 'pendingSource', control: 'input' })).toMatchObject({ controlClass: 'rw-modal-control', required: false, type: 'text', label: '来源' });
  });
});

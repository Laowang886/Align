import { BadRequestException } from '@nestjs/common';
import { KanbanController } from './kanban.controller';

const user = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
  avatarUrl: null,
};

const workspaceId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';
const columnId = '33333333-3333-4333-8333-333333333333';
const taskId = '44444444-4444-4444-8444-444444444444';

describe('KanbanController', () => {
  it('parses create task input and forwards the authenticated user', async () => {
    const service = {
      createTask: jest.fn().mockResolvedValue({ id: taskId }),
    };
    const controller = new KanbanController(service as any);

    await controller.createTask(user, workspaceId, projectId, {
      title: ' Ship it ',
      description: ' Done ',
      columnId,
    });

    expect(service.createTask).toHaveBeenCalledWith(
      'user-1',
      workspaceId,
      projectId,
      {
        title: 'Ship it',
        description: 'Done',
        columnId,
      },
    );
  });

  it('rejects invalid controller bodies before calling the service', async () => {
    const service = {
      moveTask: jest.fn(),
    };
    const controller = new KanbanController(service as any);

    expect(() =>
      controller.moveTask(user, workspaceId, projectId, taskId, {
        columnId,
        order: -1,
      }),
    ).toThrow(BadRequestException);
    expect(service.moveTask).not.toHaveBeenCalled();
  });
});

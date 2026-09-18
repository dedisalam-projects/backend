import 'reflect-metadata';
import * as fc from 'fast-check';
import { AuthService } from './auth.service';

describe('AuthService Property-Based Testing (Fast-Check)', () => {
  let authService: any; // Using any for partial mocking in PBT
  let mockUserModel: any;

  beforeEach(() => {
    mockUserModel = {
      countDocuments: jest.fn().mockResolvedValue(100),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    authService = new AuthService(
      mockUserModel,
      {} as any,
      { get: jest.fn().mockReturnValue('dummy_secret') } as any,
      {} as any,
    );
  });

  describe('getUsersPaginated', () => {
    it('should always constrain page >= 1 and limit between 1 and 100, regardless of input type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.oneof(
              fc.integer(),
              fc.string(),
              fc.float(),
              fc.boolean(),
              fc.constant(null),
              fc.constant(undefined),
            ),
            limit: fc.oneof(
              fc.integer(),
              fc.string(),
              fc.float(),
              fc.boolean(),
              fc.constant(null),
              fc.constant(undefined),
            ),
            search: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
            role: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
          }),
          async (arbitraryQuery) => {
            // Act
            const result = await authService.getUsersPaginated(arbitraryQuery as any);

            // Assert
            expect(result.meta.page).toBeGreaterThanOrEqual(1);
            expect(result.meta.limit).toBeGreaterThanOrEqual(1);
            expect(result.meta.limit).toBeLessThanOrEqual(100);

            // Verify skip computation doesn't produce NaN
            expect(mockUserModel.skip).toHaveBeenCalledWith(
              (result.meta.page - 1) * result.meta.limit,
            );
          },
        ),
        { numRuns: 1000 }, // Bombard with 1000 random inputs
      );
    });

    it('should never construct an invalid regex if search contains special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (randomSearchString) => {
            // Reset mock for accurate check
            mockUserModel.countDocuments.mockClear();

            await authService.getUsersPaginated({ search: randomSearchString });

            // If the string trims to empty, search filter isn't applied
            if (randomSearchString.trim()) {
              expect(mockUserModel.countDocuments).toHaveBeenCalledWith(
                expect.objectContaining({
                  $or: [
                    { name: { $regex: randomSearchString.trim(), $options: 'i' } },
                    { email: { $regex: randomSearchString.trim(), $options: 'i' } },
                  ],
                }),
              );
            } else {
              expect(mockUserModel.countDocuments).toHaveBeenCalledWith({});
            }
          },
        ),
        { numRuns: 1000 },
      );
    });
  });
});

# Search Controller Unit Tests

This document explains the unit tests for the search functionality.

## Setup Instructions

### 1. Install Jest

Add Jest to your `package.json` dev dependencies:

```bash
npm install --save-dev jest @babel/preset-env babel-jest
```

Or if using yarn:

```bash
yarn add --dev jest @babel/preset-env babel-jest
```

### 2. Update package.json

Add the following test scripts to your `server/package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 3. Configure Babel (if needed)

Create `server/.babelrc` for ES modules support:

```json
{
  "presets": [["@babel/preset-env", { "targets": { "node": "current" } }]]
}
```

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests in watch mode (re-run on file changes):
```bash
npm run test:watch
```

### Generate coverage report:
```bash
npm run test:coverage
```

## Test Coverage

The test suite covers **16+ test cases** across two main functions:

### `searchUsers` Tests (7 tests)
- ✓ Error handling for empty query
- ✓ Error handling for missing query
- ✓ Successful search results
- ✓ Empty results handling
- ✓ Database error handling
- ✓ Fuzzy matching configuration
- ✓ Result limit (20 max)

### `searchArtworks` Tests (9 tests)
- ✓ Error handling for empty query
- ✓ Error handling for missing query
- ✓ Successful search with user details
- ✓ Public artwork filtering
- ✓ Title boost verification (2x)
- ✓ Title and description search paths
- ✓ Empty results handling
- ✓ Database error handling
- ✓ Result limit (20 max)

## Test Structure

Each test suite follows this pattern:

```javascript
describe('Search Controller', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Setup mock request/response
  });

  describe('searchUsers', () => {
    it('should return error when query is empty', async () => {
      // Arrange
      req.query = { query: '' };

      // Act
      await searchUsers(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
```

## Mocking Strategy

The tests use Jest mocks to:

1. **Mock Database Models**: `User.aggregate()` and `Artwork.aggregate()`
2. **Mock Express Objects**: `req` and `res` objects with mock implementations
3. **Mock Return Values**: Control what the database queries return

## Key Assertions

Tests verify:

1. **Input Validation**: Empty/missing queries return 400 error
2. **Database Calls**: Aggregate pipelines are called correctly
3. **Response Format**: Results include required fields
4. **Aggregation Pipeline**: Correct stages ($search, $match, $lookup, $limit)
5. **Error Handling**: Database errors return 500 status
6. **Search Configuration**: Fuzzy matching, title boost, field paths
7. **Filtering**: Public artworks only, userId filtering in advanced search

## Example Test Output

```
PASS  src/controllers/searchController.test.js
  Search Controller
    searchUsers
      ✓ should return error when query is empty (5ms)
      ✓ should return error when query is not provided (2ms)
      ✓ should return search results for valid query (3ms)
      ✓ should return empty results when no users match (2ms)
      ✓ should handle database errors gracefully (2ms)
      ✓ should apply fuzzy matching in aggregation pipeline (1ms)
      ✓ should limit results to 20 (1ms)
    searchArtworks
      ✓ should return error when query is empty (2ms)
      ✓ should return error when query is not provided (2ms)
      ✓ should return search results with user details (3ms)
      ✓ should only return public artworks (2ms)
      ✓ should boost title matches (2ms)
      ✓ should search both title and description (1ms)
      ✓ should return empty results when no artworks match (2ms)
      ✓ should handle database errors gracefully (1ms)
      ✓ should limit results to 20 (1ms)

Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
```

## Debugging Tests

To debug a specific test, use:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome DevTools.

Or add `debugger;` statement in your test:

```javascript
it('should search correctly', async () => {
  debugger; // Execution will pause here
  await searchUsers(req, res);
});
```

## Adding New Tests

When adding new search features:

1. Create a new `describe()` block for the feature
2. Test both success and error cases
3. Verify aggregation pipeline structure
4. Test edge cases (empty results, special characters, etc.)

Example template:

```javascript
describe('newFeature', () => {
  it('should work as expected', async () => {
    // Setup
    Model.aggregate = jest.fn().mockResolvedValue([...]);
    req.query = { query: 'test' };

    // Execute
    await newFunction(req, res);

    // Verify
    expect(res.json).toHaveBeenCalledWith({ /* expected */ });
  });
});
```

## Common Issues

| Issue | Solution |
|-------|----------|
| `Cannot find module 'jest'` | Run `npm install --save-dev jest` |
| `Unexpected token import` | Add `.babelrc` with Babel preset config |
| `Test timeout` | Increase `testTimeout` in `jest.config.json` |
| `Mock not working` | Ensure `jest.clearAllMocks()` is called in `beforeEach()` |

## Integration Testing

These are **unit tests** (isolated). For integration tests with real MongoDB:

1. Use MongoDB Memory Server for local testing
2. Create separate test suite: `*.integration.test.js`
3. Use real database connections in `beforeAll()` and `afterAll()`

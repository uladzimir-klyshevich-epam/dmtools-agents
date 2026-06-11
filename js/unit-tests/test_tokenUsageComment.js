/**
 * Unit tests for js/common/tokenUsageComment.js.
 */

function loadTokenUsageComment(mocks) {
    return loadModule('js/common/tokenUsageComment.js', makeRequire({}), mocks || {});
}

suite('tokenUsageComment', function() {
    test('findUsageFiles reads manifest and filters *_usage.json entries', function() {
        var mod = loadTokenUsageComment({
            file_read: function(opts) {
                if (opts.path === 'outputs/token_usage_files.json') {
                    return JSON.stringify([
                        'outputs/story_solution_usage.json',
                        'outputs/other_report.json',
                        'outputs/kimi_usage.json'
                    ]);
                }
                return null;
            }
        });

        var files = mod.findUsageFiles('outputs');
        assert.equal(files.length, 2);
        assert.equal(files[0], 'outputs/story_solution_usage.json');
        assert.equal(files[1], 'outputs/kimi_usage.json');
    });

    test('findUsageFiles returns empty array when manifest is missing', function() {
        var mod = loadTokenUsageComment({
            file_read: function() { return null; }
        });

        var files = mod.findUsageFiles('outputs');
        assert.deepEqual(files, []);
    });

    test('formatUsageComment strips _usage suffix and includes initiator mention', function() {
        var mod = loadTokenUsageComment({});
        var comment = mod.formatUsageComment('outputs/story_solution_usage.json', { total_tokens: 42 }, 'user-123');
        assert.contains(comment, '[story_solution]: {"total_tokens":42}');
        assert.contains(comment, 'Initiator: [~accountid:user-123]');
    });

    test('formatUsageComment keeps raw id when it already contains ~', function() {
        var mod = loadTokenUsageComment({});
        var comment = mod.formatUsageComment('outputs/kimi_usage.json', { total_tokens: 1 }, '~accountid:abc');
        assert.contains(comment, 'Initiator: [~accountid:abc]');
    });

    test('postTokenUsageComments posts a Jira comment for each usage file', function() {
        var posted = [];
        var mod = loadTokenUsageComment({
            file_read: function(opts) {
                if (opts.path === 'outputs/token_usage_files.json') {
                    return JSON.stringify(['outputs/story_solution_usage.json']);
                }
                if (opts.path === 'outputs/story_solution_usage.json') {
                    return JSON.stringify({ provider: 'kimi', total_tokens: 123 });
                }
                return null;
            },
            jira_post_comment: function(args) {
                posted.push(args);
            }
        });

        var result = mod.postTokenUsageComments('TS-576', { initiator: 'user-123' });
        assert.equal(result.posted, 1);
        assert.equal(result.files.length, 1);
        assert.equal(posted.length, 1);
        assert.equal(posted[0].key, 'TS-576');
        assert.contains(posted[0].comment, '[story_solution]:');
        assert.contains(posted[0].comment, '"provider":"kimi"');
        assert.contains(posted[0].comment, 'Initiator:');
    });

    test('postTokenUsageComments skips unreadable files and reports errors', function() {
        var mod = loadTokenUsageComment({
            file_read: function(opts) {
                if (opts.path === 'outputs/token_usage_files.json') {
                    return JSON.stringify(['outputs/bad_usage.json']);
                }
                return null;
            }
        });

        var result = mod.postTokenUsageComments('TS-1');
        assert.equal(result.posted, 0);
        assert.equal(result.errors.length, 1);
        assert.contains(result.errors[0], 'outputs/bad_usage.json');
    });
});

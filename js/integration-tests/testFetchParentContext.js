/**
 * Integration test for fetchParentContextToInput.js
 *
 * Uses REAL Jira API credentials from environment variables.
 * Creates a temporary input folder and shows exactly what files
 * would be written by the pre-CLI enrichment step.
 *
 * Usage:
 *   node testFetchParentContext.js TS-1331
 *   node testFetchParentContext.js TS-575
 *   node testFetchParentContext.js TS-576
 *
 * Environment variables required:
 *   JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BASE_PATH (optional, defaults to https://dmtools.atlassian.net)
 */

var https = require('https');
var fs = require('fs');
var path = require('path');
var os = require('os');

var fetchParentContextToInput = require('../fetchParentContextToInput.js');

var JIRA_EMAIL = process.env.JIRA_EMAIL;
var JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
var JIRA_BASE = (process.env.JIRA_BASE_PATH || 'https://dmtools.atlassian.net').replace(/^https?:\/\//, '');

if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.error('ERROR: JIRA_EMAIL and JIRA_API_TOKEN must be set in environment');
    process.exit(1);
}

var ticketKey = process.argv[2];
if (!ticketKey) {
    console.error('Usage: node testFetchParentContext.js <TICKET_KEY>');
    console.error('Examples:');
    console.error('  node testFetchParentContext.js TS-1331   # subtask with parent story');
    console.error('  node testFetchParentContext.js TS-575    # story with parent epic');
    console.error('  node testFetchParentContext.js TS-576    # story with BA/SA/VD siblings');
    process.exit(1);
}

function jiraApiRequest(pathSuffix) {
    return new Promise(function(resolve, reject) {
        var auth = Buffer.from(JIRA_EMAIL + ':' + JIRA_API_TOKEN).toString('base64');
        var options = {
            hostname: JIRA_BASE,
            path: '/rest/api/2' + pathSuffix,
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        var req = https.request(options, function(res) {
            var data = '';
            res.on('data', function(chunk) { data += chunk; });
            res.on('end', function() {
                try {
                    var parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error('HTTP ' + res.statusCode + ': ' + (parsed.errorMessages || data).join(', ')));
                    }
                } catch (e) {
                    reject(new Error('Parse error: ' + e.message + '\n' + data.substring(0, 500)));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// Mock dmtools runtime globals
var writtenFiles = {};

global.jira_get_ticket = function(params) {
    var fields = params.fields || ['summary', 'status', 'description', 'parent'];
    var fieldParam = fields.join(',');
    var result = null;
    // Synchronous mock using deasync-style blocking
    var done = false;
    jiraApiRequest('/issue/' + params.key + '?fields=' + encodeURIComponent(fieldParam))
        .then(function(data) {
            result = data;
            done = true;
        })
        .catch(function(err) {
            console.warn('jira_get_ticket failed for ' + params.key + ':', err.message);
            done = true;
            throw err;
        });
    // Busy-wait for demo (not production code)
    while (!done) {
        require('deasync').sleep(10);
    }
    return result;
};

global.jira_search_by_jql = function(params) {
    var fields = params.fields || ['summary', 'status'];
    var fieldParam = fields.join(',');
    var result = null;
    var done = false;
    jiraApiRequest('/search/jql?jql=' + encodeURIComponent(params.jql) + '&fields=' + encodeURIComponent(fieldParam) + '&maxResults=50')
        .then(function(data) {
            result = data.issues || [];
            done = true;
        })
        .catch(function(err) {
            console.warn('jira_search_by_jql failed:', err.message);
            result = [];
            done = true;
        });
    while (!done) {
        require('deasync').sleep(10);
    }
    return result;
};

global.jira_get_field_custom_code = function(params) {
    // Direct mapping for TrackState project
    var knownFields = {
        'Acceptance Criteria': 'customfield_10397',
        'Solution': 'customfield_10400',
        'Diagrams': 'customfield_10399',
        'Answer': 'customfield_10398',
        'Design': 'customfield_10034'
    };
    var result = knownFields[params.fieldName];
    return result || null;
};

global.file_write = function(filePath, content) {
    writtenFiles[filePath] = content;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  [file_write] ' + filePath + ' (' + content.length + ' bytes)');
};

global.file_read = function(params) {
    var filePath = typeof params === 'string' ? params : params.path;
    if (writtenFiles[filePath]) return writtenFiles[filePath];
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        return '';
    }
};

function runTest() {
    // Project config auto-detected from ticket key prefix
    var projectKey = ticketKey.split('-')[0];
    var projectConfig = {
        jira: {
            project: projectKey,
            parentTicket: projectKey + '-1',
            parentContextFetch: {
                enabled: true,
                resolveFieldNames: true,
                parentFields: ['key', 'summary', 'description', 'status', 'Acceptance Criteria', 'Solution', 'Diagrams'],
                siblingFields: ['key', 'summary', 'description', 'status', 'comment', 'Acceptance Criteria']
            }
        }
    };

    // Override configLoader to return our projectConfig
    delete require.cache[require.resolve('../configLoader.js')];
    require.cache[require.resolve('../configLoader.js')] = {
        id: require.resolve('../configLoader.js'),
        filename: require.resolve('../configLoader.js'),
        loaded: true,
        exports: {
            loadProjectConfig: function() { return projectConfig; }
        }
    };
    console.log('\n========================================');
    console.log('Integration Test: fetchParentContextToInput.js');
    console.log('Ticket: ' + ticketKey);
    console.log('Jira: ' + JIRA_BASE);
    console.log('========================================\n');

    // First fetch the ticket to show its structure
    console.log('1. Fetching ticket ' + ticketKey + '...');
    var ticket = jira_get_ticket({ key: ticketKey, fields: ['summary','status','parent','issuetype','subtasks'] });
    if (!ticket || !ticket.fields) {
        console.error('ERROR: Could not fetch ticket ' + ticketKey);
        process.exit(1);
    }

    console.log('   Summary: ' + (ticket.fields.summary || 'N/A'));
    console.log('   Type: ' + (ticket.fields.issuetype && ticket.fields.issuetype.name || 'N/A'));
    console.log('   Status: ' + (ticket.fields.status && ticket.fields.status.name || 'N/A'));
    if (ticket.fields.parent) {
        console.log('   Parent: ' + ticket.fields.parent.key + ' - ' + (ticket.fields.parent.fields && ticket.fields.parent.fields.summary || ''));
    }
    if (ticket.fields.subtasks && ticket.fields.subtasks.length > 0) {
        console.log('   Subtasks: ' + ticket.fields.subtasks.length);
    }
    console.log('');

    // Create temp input folder
    var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fetchParentContextTest-'));
    var inputFolder = path.join(tmpDir, ticketKey);
    fs.mkdirSync(inputFolder, { recursive: true });
    console.log('2. Input folder: ' + inputFolder);
    console.log('');

    // Call the function under test
    console.log('3. Running fetchParentContextToInput.action()...\n');
    fetchParentContextToInput.action({
        inputFolderPath: inputFolder,
        ticket: ticket,
        jobParams: {
            customParams: {
                parentContextFetch: {
                    enabled: true,
                    resolveFieldNames: true,
                    parentFields: ['key', 'summary', 'description', 'status', 'Acceptance Criteria', 'Solution', 'Diagrams'],
                    siblingFields: ['key', 'summary', 'description', 'status', 'comment', 'Acceptance Criteria']
                }
            }
        }
    });

    // Show results
    console.log('\n========================================');
    console.log('4. Generated files:');
    console.log('========================================\n');

    var files = fs.readdirSync(inputFolder).sort();
    if (files.length === 0) {
        console.log('   (no files generated)');
    } else {
        files.forEach(function(file) {
            var filePath = path.join(inputFolder, file);
            var stats = fs.statSync(filePath);
            console.log('   📄 ' + file + ' (' + stats.size + ' bytes)');
        });
    }

    console.log('\n========================================');
    console.log('5. File contents preview:');
    console.log('========================================\n');

    files.forEach(function(file) {
        var filePath = path.join(inputFolder, file);
        var content = fs.readFileSync(filePath, 'utf8');
        var lines = content.split('\n');
        console.log('--- ' + file + ' ---');
        // Show first 40 lines or first 2000 chars
        var preview = lines.slice(0, 40).join('\n');
        if (content.length > 2000) {
            preview = content.substring(0, 2000) + '\n... (' + (content.length - 2000) + ' more chars)';
        }
        console.log(preview);
        console.log('');
    });

    // Cleanup option
    console.log('========================================');
    console.log('Temp folder kept at: ' + tmpDir);
    console.log('Delete with: rm -rf ' + tmpDir);
    console.log('========================================');
}

// Check for deasync dependency
try {
    require('deasync');
} catch (e) {
    console.log('Installing deasync for synchronous mock...');
    var execSync = require('child_process').execSync;
    execSync('npm install deasync --no-save', { cwd: __dirname, stdio: 'inherit' });
}

runTest();

function addManySubmodules(target, value) {
    if (!value) return;
    if (typeof value === 'string') {
        target.push({ path: value });
    } else if (Array.isArray(value)) {
        value.forEach(function(item) {
            addManySubmodules(target, item);
        });
    } else if (value.path) {
        target.push(value);
    }
}

function collectManagedSubmodules(config, customParams) {
    var modules = [];
    addManySubmodules(modules, customParams && customParams.managedSubmodules);
    addManySubmodules(modules, customParams && customParams.pushSubmodules);
    addManySubmodules(modules, config && config.git && config.git.managedSubmodules);
    addManySubmodules(modules, config && config.git && config.git.pushSubmodules);

    var seen = {};
    return modules.filter(function(module) {
        if (!module || !module.path || seen[module.path]) return false;
        seen[module.path] = true;
        return true;
    });
}

function isSafeRelativePath(path) {
    return path &&
        path[0] !== '/' &&
        path.indexOf('..') === -1 &&
        /^[A-Za-z0-9._/-]+$/.test(path);
}

function isSafeRefName(ref) {
    return ref &&
        ref[0] !== '-' &&
        ref.indexOf('..') === -1 &&
        /^[A-Za-z0-9._/-]+$/.test(ref);
}

function quoteCommitMessage(message) {
    return '"' + String(message || '')
        .replace(/"/g, '\\"')
        .replace(/[><|;`$\r\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() + '"';
}

function pushManagedSubmodules(options) {
    var run = options.run;
    var cleanOutput = options.cleanOutput || function(output) { return output || ''; };
    var config = options.config || {};
    var customParams = options.customParams || {};
    var ticketKey = options.ticketKey || 'Agent';

    collectManagedSubmodules(config, customParams).forEach(function(module) {
        var path = module.path;
        var branch = module.branch || module.targetBranch || 'main';

        if (!isSafeRelativePath(path)) {
            throw new Error('Unsafe managed submodule path: ' + path);
        }
        if (!isSafeRefName(branch)) {
            throw new Error('Unsafe managed submodule branch for ' + path + ': ' + branch);
        }

        var status = cleanOutput(run('git -C ' + path + ' status --porcelain') || '');
        if (!status.trim()) {
            console.log('No managed submodule changes detected in', path);
            return;
        }

        console.log('Committing managed submodule changes:', path, '-> origin/' + branch);
        if (config.git && config.git.authorName) {
            run('git -C ' + path + ' config user.name ' + quoteCommitMessage(config.git.authorName));
        }
        if (config.git && config.git.authorEmail) {
            run('git -C ' + path + ' config user.email ' + quoteCommitMessage(config.git.authorEmail));
        }

        run('git -C ' + path + ' add .');
        var stagedStatus = cleanOutput(run('git -C ' + path + ' status --porcelain') || '');
        if (!stagedStatus.trim()) {
            console.log('Managed submodule had no committable changes after staging:', path);
            return;
        }

        var commitMessage = module.commitMessage || (ticketKey + ' Update ' + path + ' assets');
        run('git -C ' + path + ' commit -m ' + quoteCommitMessage(commitMessage));
        run('git -C ' + path + ' push origin HEAD:' + branch);
        console.log('Managed submodule pushed:', path, '-> origin/' + branch);
    });
}

module.exports = {
    collectManagedSubmodules: collectManagedSubmodules,
    pushManagedSubmodules: pushManagedSubmodules
};

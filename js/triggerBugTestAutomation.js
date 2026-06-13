/**
 * Trigger Bug Test Automation
 * Post-action for bug_test_cases_generator.
 * Keeps the Bug in Ready For Testing and immediately triggers bug_test_automation.
 */

var autoStart = require('./common/autoStart.js');
var tokenUsageComment = require('./common/tokenUsageComment.js');

function action(params) {
    try {
        const bugKey = params.ticket.key;
        const config = params.jobParams && params.jobParams.config
            ? params.jobParams.config
            : (params.config || {});
        const customParams = (params.jobParams && params.jobParams.customParams) || params.customParams || {};

        console.log('=== Triggering bug test automation for', bugKey, '===');

        var triggered = false;
        if (customParams.autoStartBugTestAutomation && customParams.autoStartBugTestAutomationConfigFile) {
            triggered = autoStart.triggerConfiguredWorkflowForTicket({
                ticketKey: bugKey,
                customParams: customParams,
                config: config,
                configFile: customParams.autoStartBugTestAutomationConfigFile,
                label: 'bug_test_automation',
                stripKeys: [
                    'removeLabel',
                    'autoStartBugTestAutomation',
                    'autoStartBugTestAutomationConfigFile'
                ]
            });
        }

        if (!triggered) {
            console.log('Bug test automation not triggered via autoStart; asking SM to re-evaluate.');
            autoStart.triggerSmIfIdle({ config: config, customParams: customParams });
        } else {
            console.log('✅ Triggered bug_test_automation for', bugKey);
        }

        // Remove the generator SM trigger label so bug_test_cases_generator does not keep re-running
        const generatorLabel = 'sm_bug_test_cases_triggered';
        try {
            jira_remove_label({ key: bugKey, label: generatorLabel });
            console.log('✅ Removed generator SM label:', generatorLabel);
        } catch (e) {
            console.warn('Failed to remove generator SM label:', e);
        }

        // Post token usage summary comments from the test-case generation run
        try {
            tokenUsageComment.postTokenUsageComments(bugKey, { initiator: params.initiator });
        } catch (e) {
            console.warn('Failed to post token usage comments:', e);
        }

        return { success: true, triggered: triggered, bugKey: bugKey };

    } catch (error) {
        console.error('❌ Error in triggerBugTestAutomation:', error);
        return { success: false, error: error.toString() };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { action };
}

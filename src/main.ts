import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';

async function run() {
    try {

        // Set the context
        const context = github.context;

        // Get the GitHub token
        const githubToken = core.getInput('githubToken');

        // URL of the HTTP triggered Flow / Logic App
        const httpEndpoint = core.getInput('httpEndpoint');

        // Label on which issues need to be filtered e.g. bug, question etc
        const filterLabel = core.getInput('filterLabel');

        // State of the issue that need to be filtered
        const filterState = core.getInput('filterState');

        // get octokit client
        const octokit = github.getOctokit(githubToken);

        // Set the repo Url
        const repoUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}`;

        // GitHub URL which shows the filtered issues
        const filteredIssuesUrl = `${repoUrl}/issues?q=is:issue is:${filterState} label:${filterLabel}`;

        // Subject of the message that will be posted in Teams
        const subject = `List of issues labelled as ${filterLabel} that are open`;

        // Variable to to hold the object to send to Flow
        let issuesObjToSend: any = {};

        // Variable to hold the issues that are required
        let requiredIssues: any = [];

        // Build the options to get the required issues
        const opts = octokit.rest.issues.listForRepo.endpoint.merge({
            ...context.issue,
            state: filterState,
            labels: filterLabel
        })

        core.info("\u001b[93m⌛ Getting issues...");

        // Get the issues based on options
        const issues: any = await octokit.paginate(opts);

        // Build the requiredIssues object
        for (const issue of issues) {
            requiredIssues.push({
                title: issue.title,
                body: issue.body && issue.body.length > 100 ? issue.body.substring(0, 100) + "..." : issue.body,
                url: issue.html_url,
                assignedTo: issue.assignee ? issue.assignee.login : "None",
                assignedToPic: issue.assignee ? issue.assignee.avatar_url : "https://github.com/anoopt/get-issues-http-post/raw/master/images/github.png"
            })
        }

        // Log the issues
        core.info("\u001b[32m✅ Required issues are:");
        console.log(requiredIssues);

        // Create the notification text that the user will see in their mobile
        const notificationText = `There are ${requiredIssues.length} issues marked as ${filterLabel} that are ${filterState} this week.`

        // Build the object to send to the Flow
        issuesObjToSend = {
            githubUrl: filteredIssuesUrl,
            issues: requiredIssues,
            subject,
            notificationText
        }

        core.info("\u001b[93m⌛ Calling http endpoint...");

        await fetch(httpEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(issuesObjToSend)
        }).then((result: any) => {
            core.info("\u001b[32m✅ Data sent to the http end point");
        }).catch((error: any) => {
            core.error("\u001b[91m🚨 Error in calling the http end point.");
            core.error(error);
            core.setFailed(error);
        })

    } catch (error) {
        core.error("\u001b[91m🚨 There was an error while running the action.");
        core.error(error);
        core.setFailed(error.message);
    }
}

run();
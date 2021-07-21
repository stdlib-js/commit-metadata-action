/**
* @license Apache-2.0
*
* Copyright (c) 2021 The Stdlib Authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

// MODULES //

const core = require( '@actions/core' );
const github = require( '@actions/github' );
const yaml = require( 'js-yaml' );


// VARIABLES //

const RE_YAML_BLOCK = /---([\S\s]*?)---/;


// FUNCTIONS //

/**
* Extracts the commit messages from the payload of a GitHub action event.
*
* @private
* @returns {Array} commit message objects
*/
function extractCommitMessages() {
	const out = [];
	const payload = github.context.payload;
	if ( !payload ) {
		return out;
	}
	switch ( github.context.eventName ) {
	case 'pull_request': {
		const pullRequest = payload.pull_request;
		if ( pullRequest ) {
			let msg = pullRequest.title;
			if ( pullRequest.body ) {
				msg = msg.concat( '\n\n', pullRequest.body );
			}
			out.push({
				message: msg,
				...pullRequest
			});
		}
		return out;
	}
	case 'push': {
		const commits = payload.commits;
		if ( commits ) {
			for ( let i = 0; i < commits.length; i++ ) {
				const commit = commits[ i ];
				if ( commit.message ) {
					out.push({
						message: commit.message,
						url: commit.url,
						id: commit.id,
						author: commit.author
					});
				}
			}
		}
		return out;
	}
	default:
		throw new Error( `Unsupported event type: ${github.context.eventName}` );
	}
}


// MAIN //

/**
* Main function.
*/ 
async function main() {
	try {
		const messages = extractCommitMessages();
		const metadata = [];
		core.debug( 'Commit messages: '+messages.join( '\n' ) );
		for ( let i = 0; i < messages.length; i++ ) {
			const { author, id, message, url } = messages[ i ];
			core.info( 'Processing commit: '+JSON.stringify( messages[ i ] ) );
			let metadataBlock = message.match( RE_YAML_BLOCK );
			if ( metadataBlock ) {
				// Extract the first capture group containing the YAML block:
				metadataBlock = metadataBlock[ 1 ];
				const meta = yaml.load( metadataBlock );
				meta.author = author;
				meta.id = id;
				meta.url = url; 
				metadata.push( meta );
			}
		}
		if ( !metadata.length ) {
			core.info( 'No metadata block found in commit messages.' );
		} 
		core.setOutput( 'metadata', metadata )
	} catch ( e ) {
		core.error( e );
		core.setFailed( e.message );
	}
}

main();
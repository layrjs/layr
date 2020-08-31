import React from 'react';
import ReactDOM from 'react-dom';
import {Component, attribute, provide} from '@liaison/component';
import {Storable} from '@liaison/storable';
import {ComponentHTTPClient} from '@liaison/component-http-client';
import {view, useAsyncCall, useAsyncCallback} from '@liaison/react-integration';

async function main() {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const BackendMessage = await client.getComponent();

  class Message extends BackendMessage {
    @view() View() {
      return (
        <p>
          <small>{this.createdAt.toLocaleString()}</small>
          <br />
          <strong>{this.text}</strong>
        </p>
      );
    }

    @view() Editor({onSubmit}) {
      const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(async (event) => {
        event.preventDefault();
        await onSubmit();
      }, []);

      return (
        <form onSubmit={handleSubmit}>
          <div>
            <textarea
              value={this.text}
              onChange={(event) => {
                this.text = event.target.value;
              }}
              required
              style={{width: '100%', height: '80px'}}
            />
          </div>

          <p>
            <button type="submit" disabled={isSubmitting}>
              Submit
            </button>
          </p>

          {submitError && (
            <p style={{color: 'red'}}>Sorry, an error occurred while submitting your message.</p>
          )}
        </form>
      );
    }
  }

  class Guestbook extends Component {
    @provide() static Message = Message;

    @attribute('Message[]?') existingMessages;
    @attribute('Message') userMessage = new this.constructor.Message();

    @view() View() {
      const {Message} = this.constructor;

      const [isLoading] = useAsyncCall(async () => {
        this.existingMessages = await Message.find(
          {},
          {text: true, createdAt: true},
          {sort: {createdAt: 'desc'}, limit: 30}
        );
      }, []);

      const [addMessage] = useAsyncCallback(async () => {
        await this.userMessage.save();
        this.existingMessages = [this.userMessage, ...this.existingMessages];
        this.userMessage = new Message();
      }, []);

      if (isLoading) {
        return null;
      }

      if (this.existingMessages === undefined) {
        return (
          <p style={{color: 'red'}}>
            Sorry, an error occurred while loading the guestbook’s messages.
          </p>
        );
      }

      return (
        <div style={{maxWidth: '700px', margin: '40px auto'}}>
          <h1>Guestbook</h1>

          <h2>All Messages</h2>

          {this.existingMessages.length > 0 ? (
            this.existingMessages.map((message) => <message.View key={message.id} />)
          ) : (
            <p>No messages yet.</p>
          )}

          <h2>Add a Message</h2>

          <this.userMessage.Editor onSubmit={addMessage} />
        </div>
      );
    }
  }

  const guestbook = new Guestbook();

  ReactDOM.render(<guestbook.View />, document.getElementById('root'));
}

main().catch((error) => console.error(error));

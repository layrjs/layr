import React, {useCallback} from 'react';
import ReactDOM from 'react-dom';
import {Component, attribute, provide} from '@liaison/component';
import {Storable} from '@liaison/storable';
import {Routable, route} from '@liaison/routable';
import {ComponentHTTPClient} from '@liaison/component-http-client';
import {
  view,
  useBrowserRouter,
  useAsyncCall,
  useAsyncCallback,
  useAsyncMemo,
  useRecomputableMemo
} from '@liaison/react-integration';

async function main() {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const BackendMessage = await client.getComponent();

  class Message extends BackendMessage {
    @view() Viewer() {
      return (
        <div>
          <small>{this.createdAt.toLocaleString()}</small>
          <br />
          <strong>{this.text}</strong>
        </div>
      );
    }

    @view() Form({onSubmit}) {
      const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(async (event) => {
        event.preventDefault();
        await onSubmit();
      });

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

  class Guestbook extends Routable(Component) {
    @provide() static Message = Message;

    @attribute('Message[]') static existingMessages = [];

    @view() static Root() {
      const [router, isReady] = useBrowserRouter(this);

      if (!isReady) {
        return null;
      }

      const content = router.callCurrentRoute({fallback: () => 'Sorry, there is nothing here.'});

      return (
        <div style={{maxWidth: '700px', margin: '40px auto'}}>
          <h1>Guestbook</h1>
          {content}
        </div>
      );
    }

    @route('/') @view() static Home() {
      return (
        <div>
          <this.MessageList />
          <this.MessageCreator />
        </div>
      );
    }

    @view() static MessageList() {
      const {Message} = this;

      const [isLoading, loadingError] = useAsyncCall(async () => {
        this.existingMessages = await Message.find(
          {},
          {text: true, createdAt: true},
          {sort: {createdAt: 'desc'}, limit: 30}
        );
      });

      if (isLoading) {
        return null;
      }

      if (loadingError) {
        return (
          <p style={{color: 'red'}}>
            Sorry, an error occurred while loading the guestbook’s messages.
          </p>
        );
      }

      return (
        <div>
          <h2>All Messages</h2>
          {this.existingMessages.length > 0 ? (
            this.existingMessages.map((message) => (
              <div key={message.id} style={{marginTop: '15px'}}>
                <message.Viewer />
                <div style={{marginTop: '5px'}}>
                  <this.MessageEditor.Link params={message}>Edit</this.MessageEditor.Link>
                </div>
              </div>
            ))
          ) : (
            <p>No messages yet.</p>
          )}
        </div>
      );
    }

    @view() static MessageCreator() {
      const {Message} = this;

      const [createdMessage, resetCreatedMessage] = useRecomputableMemo(() => new Message());

      const saveMessage = useCallback(async () => {
        await createdMessage.save();
        this.existingMessages = [createdMessage, ...this.existingMessages];
        resetCreatedMessage();
      }, [createdMessage]);

      return (
        <div>
          <h2>Add a Message</h2>
          <createdMessage.Form onSubmit={saveMessage} />
        </div>
      );
    }

    @route('/messages/:id') @view() static MessageEditor({id}) {
      const {Message} = this;

      const [
        {existingMessage, editedMessage} = {},
        isLoading,
        loadingError
      ] = useAsyncMemo(async () => {
        const existingMessage = await Message.get(id, {text: true});
        const editedMessage = existingMessage.fork();
        return {existingMessage, editedMessage};
      }, [id]);

      const saveMessage = useCallback(async () => {
        await editedMessage.save();
        existingMessage.merge(editedMessage);
        this.Home.navigate();
      }, [existingMessage, editedMessage]);

      if (isLoading) {
        return null;
      }

      if (loadingError) {
        return (
          <p style={{color: 'red'}}>
            Sorry, an error occurred while loading a guestbook’s message.
          </p>
        );
      }

      return (
        <div>
          <h2>Edit a Message</h2>
          <editedMessage.Form onSubmit={saveMessage} />
        </div>
      );
    }
  }

  ReactDOM.render(<Guestbook.Root />, document.getElementById('root'));
}

main().catch((error) => console.error(error));

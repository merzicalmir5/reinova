/**
 * Body Tavus sends to callback_url after POST /v2/videos.
 * @see https://docs.tavus.io/sections/webhooks-and-callbacks — Video Generation Callbacks
 */
export type TavusVideoCallbackPayload = {
  video_id: string;
  status: string;
  video_name?: string;
  replica_id?: string;
  hosted_url?: string | null;
  download_url?: string | null;
  stream_url?: string | null;
  status_details?: string | null;
  error_details?: string | null;
  generation_progress?: string;
  created_at?: string;
  updated_at?: string;
  data?: { script?: string };
};

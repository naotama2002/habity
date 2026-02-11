package habitify

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const defaultBaseURL = "https://api.habitify.me"

// Client is a client for the Habitify API.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new Habitify API client.
func NewClient(apiKey string) *Client {
	return &Client{
		baseURL:    defaultBaseURL,
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// NewClientWithBaseURL creates a new client with a custom base URL (for testing).
func NewClientWithBaseURL(apiKey, baseURL string) *Client {
	return &Client{
		baseURL:    baseURL,
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// Validate checks if the API key is valid by calling GetHabits.
func (c *Client) Validate(ctx context.Context) error {
	_, err := c.GetHabits(ctx)
	return err
}

// GetHabits fetches all habits from the Habitify API.
func (c *Client) GetHabits(ctx context.Context) ([]Habit, error) {
	resp, err := c.doRequest(ctx, "/habits")
	if err != nil {
		return nil, fmt.Errorf("get habits: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get habits: status %d: %s", resp.StatusCode, string(body))
	}

	var result Response[[]Habit]
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("get habits: decode response: %w", err)
	}

	if !result.Status {
		return nil, fmt.Errorf("get habits: API returned error: %s", result.Message)
	}

	return result.Data, nil
}

// GetLogs fetches logs for a specific habit within a date range.
func (c *Client) GetLogs(ctx context.Context, habitID string, from, to time.Time) ([]Log, error) {
	// Habitify API requires YYYY-MM-DDThh:mm:ss±hh:mm (not "Z" for UTC)
	const habitifyDateFmt = "2006-01-02T15:04:05-07:00"
	params := url.Values{}
	params.Set("from", from.Format(habitifyDateFmt))
	params.Set("to", to.Format(habitifyDateFmt))
	path := fmt.Sprintf("/logs/%s?%s", habitID, params.Encode())

	resp, err := c.doRequest(ctx, path)
	if err != nil {
		return nil, fmt.Errorf("get logs for habit %s: %w", habitID, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get logs for habit %s: status %d: %s", habitID, resp.StatusCode, string(body))
	}

	var result Response[[]Log]
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("get logs for habit %s: decode response: %w", habitID, err)
	}

	if !result.Status {
		return nil, fmt.Errorf("get logs for habit %s: API returned error: %s", habitID, result.Message)
	}

	return result.Data, nil
}

func (c *Client) doRequest(ctx context.Context, path string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", c.apiKey)
	return c.httpClient.Do(req)
}

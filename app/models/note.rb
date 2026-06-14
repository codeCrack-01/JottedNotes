class Note < ApplicationRecord
  # Tells Rails to intercept the content field and manage it as a rich-text engine object
  has_rich_text :content
end
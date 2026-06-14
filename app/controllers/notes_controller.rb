# frozen_string_literal: true

class Notes_controller
  def note_params
    params.require(:note).permit(:title, :content)
  end
end

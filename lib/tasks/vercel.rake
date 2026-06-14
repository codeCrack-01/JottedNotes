namespace :vercel do
  desc "Render all ERB templates to static files in public/"
  task export: :environment do
    renderer = Class.new(ActionController::Base) do
      prepend_view_path "app/views"
    end

    pages = {
      "home/index" => { layout: "application", output: "public/index.html" },
      "pwa/manifest" => { layout: false, output: "public/manifest.json" },
      "pwa/service-worker" => { layout: false, output: "public/service-worker.js" }
    }

    pages.each do |template, config|
      puts "  Rendering #{template}..."
      html = renderer.render(
        template: template,
        layout: config[:layout]
      )
      File.write(Rails.root.join(config[:output]), html)
      puts "    -> #{config[:output]}"
    end

    puts "  Done! Static pages exported to public/"
  end
end
